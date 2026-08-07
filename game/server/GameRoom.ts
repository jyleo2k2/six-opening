import { CloseCode, Room, type Client } from 'colyseus';
import { sectorName } from '../data';
import {
  createInitialState,
  reduce,
  settle,
  viewFor,
  EMOTES,
  RULES,
  nextInt,
  type Action,
  type ChatVerb,
  type GameState,
  type RngState,
  type Sector,
  type SetupPlayer,
} from '../src/index';
import { chatMove, eventEmote, infoAction, tradeActions, PERSONAS, TUNE, type BotPersona } from './bot';

/**
 * 영웅키움 룸 (2~8인) — **권위 판정자 + 페이즈 타이머 + 템플릿 채팅 릴레이 + 봇**.
 *
 * - 판정은 전부 룰 엔진 reduce()다. 판정 로직을 여기 새로 쓰지 말 것.
 * - 상태 송신은 반드시 viewFor()를 거친 개별 send — broadcast(state) 금지 (기획서 §9).
 * - 회의는 템플릿 조합만: 엔진이 검증·거짓말 기록, 서버는 문장 조립·릴레이만 (기획서 §4).
 * - 봇의 성격·행동은 전부 ./bot.ts — 서버는 타이밍만 관리한다.
 */
export interface JoinOptions {
  nickname?: string;
}

const RECONNECT_SECONDS = 60;

/** 사람 플레이어 색 팔레트 — 방장부터 순서대로 */
const HUMAN_COLORS = ['#4dc8ff', '#ffd166', '#35e08c', '#ff8fa3', '#a78bfa', '#f2a03d', '#5aa9ff', '#eaf4ff'];

export class GameRoom extends Room {
  maxClients = RULES.maxPlayers;

  private game: GameState | null = null;
  private hostId: string | null = null;
  private nicknames = new Map<string, string>();
  private ready = new Set<string>();
  private phaseTimer: { clear(): void } | null = null;

  private bots: BotPersona[] = [];
  private botRng: RngState = { seed: (Date.now() ^ 0x5bd1e995) | 0 };
  private botPrepDone = new Set<string>();

  onCreate() {
    this.onMessage('start', (client: Client, payload: { mode?: string }) => this.handleStart(client, payload));
    this.onMessage('addBot', (client: Client) => this.handleAddBot(client));
    this.onMessage('action', (client: Client, action: Action) => this.handleAction(client, action));
    this.onMessage('chat', (client: Client, payload: { subject?: string; sector?: string; verb?: string }) =>
      this.handleChat(client, payload),
    );
    this.onMessage('shareNews', (client: Client) => this.handleShareNews(client));
    this.onMessage('emote', (client: Client, payload: { kind?: string }) => this.handleEmote(client, payload));
    this.onMessage('ready', (client: Client) => this.handleReady(client));
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    if (!this.hostId) this.hostId = client.sessionId;
    const nickname = options.nickname?.trim() || `주주${this.clients.length}`;
    this.nicknames.set(client.sessionId, nickname);
    this.broadcastLobby();
  }

  private totalSeats(): number {
    return this.clients.length + this.bots.length;
  }

  private addBot(): boolean {
    if (this.totalSeats() >= RULES.maxPlayers) return false;
    const persona = PERSONAS[this.bots.length % PERSONAS.length];
    this.bots.push({ ...persona, id: `${persona.id}-${this.bots.length}` });
    return true;
  }

  private handleAddBot(client: Client) {
    if (this.game) return client.send('rejected', { reason: '게임 중에는 봇을 추가할 수 없다' });
    if (client.sessionId !== this.hostId) return client.send('rejected', { reason: '방장만 봇을 추가할 수 있다' });
    if (!this.addBot()) return client.send('rejected', { reason: '자리가 없다' });
    this.broadcastLobby();
  }

  private handleStart(client: Client, payload: { mode?: string } = {}) {
    if (this.game) return;
    if (client.sessionId !== this.hostId) {
      return client.send('rejected', { reason: '방장만 시작할 수 있다' });
    }
    const quick = payload.mode === 'quick';
    // ⚡ 퀵 매치 — 봇을 채워 혼자서도 바로 시작 (기획서 §1)
    if (quick) {
      while (this.totalSeats() < RULES.quickMatchSeats) this.addBot();
      this.broadcastLobby();
    }
    if (this.totalSeats() < RULES.minPlayers) {
      return client.send('rejected', { reason: `최소 ${RULES.minPlayers}명이 필요하다 (봇 추가 가능)` });
    }

    const humans: SetupPlayer[] = this.clients.map((c, i) => {
      const nickname = this.nicknames.get(c.sessionId) ?? '주주';
      return { id: c.sessionId, nickname, color: HUMAN_COLORS[i % HUMAN_COLORS.length], ch: nickname.slice(0, 1) };
    });
    const botPlayers: SetupPlayer[] = this.bots.map((b) => ({
      id: b.id,
      nickname: b.nickname,
      color: b.color,
      ch: b.ch,
      bot: true,
    }));

    this.game = createInitialState({
      seed: Date.now() & 0x7fffffff,
      players: [...humans, ...botPlayers],
      turns: quick ? RULES.turnsQuick : RULES.turnsRegular,
    });
    this.lock();
    this.sendViews();
    this.schedulePhase();
  }

  private phaseSeconds(): number {
    const g = this.game!;
    switch (g.phase) {
      case 'prep':
        return g.turn === 1 ? RULES.prepFirstSeconds : RULES.prepSeconds;
      case 'chat':
        return RULES.chatSeconds;
      case 'event':
        return RULES.eventSeconds;
      case 'rank':
        return RULES.rankSeconds;
      default:
        return 0;
    }
  }

  /** 페이즈 타이머 — 서버가 권위. 클라는 남은 시간 표시만 한다 */
  private schedulePhase() {
    this.phaseTimer?.clear();
    if (!this.game || this.game.phase === 'ended') return;

    const seconds = this.phaseSeconds();
    this.ready.clear();
    if (this.game.phase === 'prep') this.botPrepDone.clear();
    this.broadcast('phase', { phase: this.game.phase, turn: this.game.turn, seconds });
    this.scheduleBots();
    this.phaseTimer = this.clock.setTimeout(() => this.advance(), seconds * 1000);
  }

  private advance() {
    if (!this.game) return;
    // 사람이 서둘러도 봇의 매매가 페이즈 전환에 잘리지 않게 즉시 실행
    if (this.game.phase === 'prep') this.flushBotPrep();

    const result = reduce(this.game, { type: 'advancePhase' });
    if (!result.ok) return;

    this.game = result.value;
    this.sendViews();

    if (this.game.phase === 'ended') {
      this.phaseTimer?.clear();
      // TODO(T6): 명예의 전당 — 최종 결과를 Supabase에 기록
      this.broadcast('settled', settle(this.game));
      return;
    }
    this.schedulePhase();
  }

  private handleAction(client: Client, action: Action) {
    if (!this.game) return client.send('rejected', { reason: '아직 게임이 시작되지 않았다' });
    if (action.type === 'advancePhase') {
      return client.send('rejected', { reason: '페이즈 전환은 서버만 한다' });
    }
    if (action.type === 'chat') {
      return client.send('rejected', { reason: '회의 발화는 chat 메시지로 보낸다' });
    }
    if (action.playerId !== client.sessionId) {
      return client.send('rejected', { reason: '자기 액션만 보낼 수 있다' });
    }

    const result = reduce(this.game, action);
    if (!result.ok) return client.send('rejected', { reason: result.reason, action });
    this.game = result.value;
    this.sendViews();
  }

  /** 템플릿 회의 발화 — 엔진이 조합 검증·거짓말 기록, 여기선 문장 조립·릴레이 */
  private handleChat(client: Client, payload: { subject?: string; sector?: string; verb?: string }) {
    this.relayChat(client.sessionId, payload);
  }

  private relayChat(playerId: string, payload: { subject?: string; sector?: string; verb?: string }): boolean {
    if (!this.game) return false;
    const action: Action = {
      type: 'chat',
      playerId,
      subject: String(payload.subject ?? ''),
      sector: String(payload.sector ?? '') as Sector,
      verb: String(payload.verb ?? '') as ChatVerb,
    };
    const result = reduce(this.game, action);
    if (!result.ok) {
      this.clients.find((c) => c.sessionId === playerId)?.send('rejected', { reason: result.reason });
      return false;
    }
    this.game = result.value;
    const speaker = this.game.players.find((p) => p.id === playerId)!;
    this.broadcast('chat', {
      playerId,
      nickname: speaker.nickname,
      color: speaker.color,
      ch: speaker.ch,
      text: `[${action.subject}] [${sectorName(action.sector)}] [${action.verb}]`,
    });
    return true;
  }

  /** 📰 내 뉴스 공유 — 본인이 선택해 원문을 공개한다 (진위 표시 없이) */
  private handleShareNews(client: Client) {
    this.shareNewsOf(client.sessionId);
  }

  private shareNewsOf(playerId: string) {
    if (!this.game || this.game.phase !== 'chat') return;
    const player = this.game.players.find((p) => p.id === playerId);
    const news = player?.news.find((n) => n.turn === this.game!.turn);
    if (!player || !news) return;
    this.broadcast('chat', {
      playerId,
      nickname: player.nickname,
      color: player.color,
      ch: player.ch,
      text: `[내 뉴스] ${news.text}`,
    });
  }

  private handleEmote(client: Client, payload: { kind?: string }) {
    const kind = String(payload?.kind ?? '');
    if (!(EMOTES as readonly string[]).includes(kind)) return;
    this.broadcast('emote', { playerId: client.sessionId, kind });
  }

  /** 사람 전원이 준비되면 조기 전환 — 봇은 진행을 막지 않는다 */
  private handleReady(client: Client) {
    if (!this.game || this.game.phase === 'ended') return;
    this.ready.add(client.sessionId);
    if (this.ready.size >= this.clients.length) this.advance();
  }

  // ── 봇 구동 — 내용은 bot.ts, 여기는 타이밍만 ─────────────────────────
  private scheduleBots() {
    if (!this.game || this.bots.length === 0) return;
    const phase = this.game.phase;
    const turn = this.game.turn;

    for (const bot of this.bots) {
      const [min, max] =
        phase === 'prep'
          ? [TUNE.actDelayMinMs, TUNE.actDelayMaxMs]
          : phase === 'chat'
            ? [TUNE.chatDelayMinMs, TUNE.chatDelayMaxMs]
            : [TUNE.emoteDelayMinMs, TUNE.emoteDelayMaxMs];
      const delay = min + nextInt(this.botRng, Math.max(1, max - min));

      this.clock.setTimeout(() => {
        if (!this.game || this.game.phase !== phase || this.game.turn !== turn) return;
        if (phase === 'prep') this.botPrep(bot);
        else if (phase === 'chat') this.botChat(bot);
        else this.botEmote(bot);
      }, delay);
    }
  }

  private flushBotPrep() {
    for (const bot of this.bots) this.botPrep(bot);
  }

  private botPrep(bot: BotPersona) {
    if (!this.game || this.game.phase !== 'prep' || this.botPrepDone.has(bot.id)) return;
    this.botPrepDone.add(bot.id);

    const info = infoAction(viewFor(this.game, bot.id), bot, this.botRng);
    if (info) this.applyBotAction(info);
    for (const action of tradeActions(viewFor(this.game, bot.id), bot, this.botRng)) {
      this.applyBotAction(action);
    }
    this.sendViews();
  }

  private botChat(bot: BotPersona) {
    if (!this.game || this.game.phase !== 'chat') return;
    const move = chatMove(viewFor(this.game, bot.id), bot, this.botRng);
    if (!move) return;
    if (move.kind === 'shareNews') this.shareNewsOf(bot.id);
    else this.relayChat(bot.id, move);
  }

  private botEmote(bot: BotPersona) {
    if (!this.game) return;
    const kind = eventEmote(viewFor(this.game, bot.id), bot, this.botRng);
    if (!kind) return;
    this.broadcast('emote', { playerId: bot.id, kind });
  }

  /** 봇도 사람과 같은 판정 — 거부되면 조용히 관망 */
  private applyBotAction(action: Action) {
    if (!this.game) return;
    const result = reduce(this.game, action);
    if (result.ok) this.game = result.value;
  }

  /** WebView 백그라운드 전환 대응 — 재접속 대기 (기술스택 §5) */
  async onDrop(client: Client, code?: number) {
    if (code === CloseCode.CONSENTED) return;
    if (!this.game || this.game.phase === 'ended') return;

    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
    } catch {
      this.broadcast('player-left', { playerId: client.sessionId });
    }
  }

  onReconnect(client: Client) {
    if (!this.game) return;
    client.send('state', viewFor(this.game, client.sessionId));
    this.broadcast('phase', { phase: this.game.phase, turn: this.game.turn, seconds: null });
  }

  /** 정보 비대칭의 관문 — broadcast('state', …) 금지, 플레이어별 개별 send */
  private sendViews() {
    if (!this.game) return;
    for (const client of this.clients) {
      client.send('state', viewFor(this.game, client.sessionId));
    }
  }

  private broadcastLobby() {
    this.broadcast('lobby', {
      hostId: this.hostId,
      min: RULES.minPlayers,
      max: RULES.maxPlayers,
      players: [
        ...this.clients.map((c) => ({
          id: c.sessionId,
          nickname: this.nicknames.get(c.sessionId),
          isBot: false,
        })),
        ...this.bots.map((bot) => ({ id: bot.id, nickname: bot.nickname, isBot: true })),
      ],
    });
  }
}
