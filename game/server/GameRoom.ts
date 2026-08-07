import { CloseCode, Room, type Client } from 'colyseus';
import {
  createInitialState,
  nextInt,
  reduce,
  settle,
  viewFor,
  EMOTES,
  RULES,
  type Action,
  type GameState,
  type RngState,
} from '../src/index';
import { chatLine, eventEmote, infoAction, tradeActions, PERSONAS, TUNE, type BotPersona } from './bot';

/**
 * 2~8인 히스토리 투자 시뮬 룸 — **권위 판정자 + 페이즈 타이머 + 채팅 릴레이 + 봇**.
 *
 * - 판정은 전부 룰 엔진 reduce()다. 판정 로직을 여기 새로 쓰지 말 것.
 * - 상태 송신은 반드시 viewFor()를 거친 플레이어별 개별 send다.
 *   전체 상태 broadcast 금지 — 이벤트 큐·타인 뉴스·정보 내용이 와이어에 실리면
 *   게임이 죽는다 (기획서 §9, game/AGENTS.md 불변식).
 * - 채팅·이모티콘은 자산에 영향이 없어 룰 밖 — 여기서 릴레이만 한다.
 * - 봇은 사람과 동급 플레이어다: viewFor()로 보고 reduce()로 행동한다.
 *   봇의 성격·행동 로직은 전부 ./bot.ts — 서버는 타이밍만 관리한다.
 */
export interface JoinOptions {
  nickname?: string;
}

const RECONNECT_SECONDS = 60;

const PHASE_SECONDS = {
  prep: RULES.prepSeconds,
  chat: RULES.chatSeconds,
  event: RULES.eventSeconds,
} as const;

export class GameRoom extends Room {
  maxClients = RULES.maxPlayers;

  private game: GameState | null = null;
  /** 방장 = 처음 들어온 사람. 시작·봇 추가는 방장만 (초대코드 방) */
  private hostId: string | null = null;
  private nicknames = new Map<string, string>();
  private ready = new Set<string>();
  private phaseTimer: { clear(): void } | null = null;

  private bots: BotPersona[] = [];
  private botRng: RngState = { seed: (Date.now() ^ 0x5bd1e995) | 0 };
  /** 이번 준비 페이즈에 이미 행동한 봇 — 조기 전환 시 나머지는 flush로 즉시 행동 */
  private botPrepDone = new Set<string>();

  onCreate() {
    this.onMessage('start', (client: Client) => this.handleStart(client));
    this.onMessage('addBot', (client: Client) => this.handleAddBot(client));
    this.onMessage('action', (client: Client, action: Action) => this.handleAction(client, action));
    this.onMessage('chat', (client: Client, payload: { text?: string }) => this.handleChat(client, payload));
    this.onMessage('emote', (client: Client, payload: { kind?: string }) => this.handleEmote(client, payload));
    this.onMessage('ready', (client: Client) => this.handleReady(client));
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    if (!this.hostId) this.hostId = client.sessionId;
    const nickname = options.nickname?.trim() || `플레이어${this.clients.length}`;
    this.nicknames.set(client.sessionId, nickname);
    this.broadcastLobby();
  }

  private totalSeats(): number {
    return this.clients.length + this.bots.length;
  }

  private handleAddBot(client: Client) {
    if (this.game) return client.send('rejected', { reason: '게임 중에는 봇을 추가할 수 없다' });
    if (client.sessionId !== this.hostId) {
      return client.send('rejected', { reason: '방장만 봇을 추가할 수 있다' });
    }
    if (this.totalSeats() >= RULES.maxPlayers) {
      return client.send('rejected', { reason: '자리가 없다' });
    }
    const persona = PERSONAS[this.bots.length % PERSONAS.length];
    this.bots.push({ ...persona, id: `${persona.id}-${this.bots.length}` });
    this.broadcastLobby();
  }

  private handleStart(client: Client) {
    if (this.game) return;
    if (client.sessionId !== this.hostId) {
      return client.send('rejected', { reason: '방장만 시작할 수 있다' });
    }
    if (this.totalSeats() < RULES.minPlayers) {
      return client.send('rejected', { reason: `최소 ${RULES.minPlayers}명이 필요하다 (봇 추가 가능)` });
    }

    this.game = createInitialState({
      seed: Date.now() & 0x7fffffff,
      players: [
        ...this.clients.map((c) => ({
          id: c.sessionId,
          nickname: this.nicknames.get(c.sessionId) ?? '플레이어',
        })),
        ...this.bots.map((bot) => ({ id: bot.id, nickname: bot.nickname })),
      ],
    });
    this.lock();
    this.sendViews();
    this.schedulePhase();
  }

  /** 페이즈 타이머 — 서버가 권위. 클라는 남은 시간 표시만 한다 */
  private schedulePhase() {
    this.phaseTimer?.clear();
    if (!this.game || this.game.phase === 'ended') return;

    const seconds = PHASE_SECONDS[this.game.phase];
    this.ready.clear();
    if (this.game.phase === 'prep') this.botPrepDone.clear();
    this.broadcast('phase', { phase: this.game.phase, turn: this.game.turn, seconds });
    this.scheduleBots();
    this.phaseTimer = this.clock.setTimeout(() => this.advance(), seconds * 1000);
  }

  private advance() {
    if (!this.game) return;
    // 사람이 서두르면 봇의 매매가 페이즈 전환에 잘리지 않도록 즉시 실행한다
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
    if (action.playerId !== client.sessionId) {
      return client.send('rejected', { reason: '자기 액션만 보낼 수 있다' });
    }

    const result = reduce(this.game, action);
    if (!result.ok) {
      return client.send('rejected', { reason: result.reason, action });
    }
    this.game = result.value;
    this.sendViews();
  }

  private handleChat(client: Client, payload: { text?: string }) {
    if (!this.game) return;
    if (this.game.phase !== 'chat') {
      return client.send('rejected', { reason: '채팅 페이즈에만 말할 수 있다' });
    }
    const text = String(payload?.text ?? '').slice(0, RULES.chatMaxLength).trim();
    if (!text) return;
    // 자유 채팅 — 검수 대상 아님, 릴레이만. 금칙어 필터는 후속(T4)
    this.broadcast('chat', {
      playerId: client.sessionId,
      nickname: this.nicknames.get(client.sessionId),
      text,
    });
  }

  private handleEmote(client: Client, payload: { kind?: string }) {
    const kind = String(payload?.kind ?? '');
    if (!(EMOTES as readonly string[]).includes(kind)) return;
    // 이모티콘은 모든 페이즈 상시 (기획서 §4)
    this.broadcast('emote', { playerId: client.sessionId, kind });
  }

  /** 사람 전원이 준비되면 조기 전환 — 봇은 준비를 기다리게 하지 않는다 */
  private handleReady(client: Client) {
    if (!this.game || this.game.phase === 'ended') return;
    this.ready.add(client.sessionId);
    if (this.ready.size >= this.clients.length) this.advance();
  }

  // ── 봇 구동 — 행동 내용은 전부 bot.ts, 여기는 타이밍만 ────────────────
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
        // 조기 전환 등으로 페이즈가 지나갔으면 무시 (준비 매매는 flush가 처리)
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

    // 1) 정보소 — 적용돼야 예보 내용이 생기므로 매매보다 먼저
    const info = infoAction(viewFor(this.game, bot.id), bot, this.botRng);
    if (info) this.applyBotAction(info);
    // 2) 매매 — 예보가 반영된 최신 뷰로 계획
    for (const action of tradeActions(viewFor(this.game, bot.id), bot, this.botRng)) {
      this.applyBotAction(action);
    }
    this.sendViews();
  }

  private botChat(bot: BotPersona) {
    if (!this.game || this.game.phase !== 'chat') return;
    const line = chatLine(viewFor(this.game, bot.id), bot, this.botRng);
    if (!line) return;
    this.broadcast('chat', { playerId: bot.id, nickname: bot.nickname, text: line });
  }

  private botEmote(bot: BotPersona) {
    if (!this.game) return;
    const kind = eventEmote(viewFor(this.game, bot.id), bot, this.botRng);
    if (!kind) return;
    this.broadcast('emote', { playerId: bot.id, kind });
  }

  /** 봇도 사람과 같은 판정을 받는다 — 거부되면 조용히 관망 */
  private applyBotAction(action: Action) {
    if (!this.game) return;
    const result = reduce(this.game, action);
    if (result.ok) this.game = result.value;
  }

  /**
   * 예기치 못한 연결 끊김 — WebView 백그라운드 전환이 실사용 최대 이슈다 (기술스택 §5).
   * 스스로 나간 경우(CONSENTED)가 아니면 재접속을 기다린다.
   */
  async onDrop(client: Client, code?: number) {
    if (code === CloseCode.CONSENTED) return;
    if (!this.game || this.game.phase === 'ended') return;

    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
    } catch {
      this.broadcast('player-left', { playerId: client.sessionId });
    }
  }

  /** 돌아온 클라이언트에게 자기 뷰를 다시 밀어준다 */
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
