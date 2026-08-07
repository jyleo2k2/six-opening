import { CloseCode, Room, type Client } from 'colyseus';
import {
  createInitialState,
  reduce,
  settle,
  viewFor,
  EMOTES,
  RULES,
  type Action,
  type GameState,
} from '../src/index';

/**
 * 2~8인 히스토리 투자 시뮬 룸 — **권위 판정자 + 페이즈 타이머 + 채팅 릴레이**.
 *
 * - 판정은 전부 룰 엔진 reduce()다. 판정 로직을 여기 새로 쓰지 말 것.
 * - 상태 송신은 반드시 viewFor()를 거친 플레이어별 개별 send다.
 *   전체 상태 broadcast 금지 — 이벤트 큐·타인 뉴스·정보 내용이 와이어에 실리면
 *   게임이 죽는다 (기획서 §9, game/AGENTS.md 불변식).
 * - 채팅·이모티콘은 자산에 영향이 없어 룰 밖 — 여기서 릴레이만 한다.
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
  /** 방장 = 처음 들어온 사람. 시작 버튼은 방장만 (초대코드 방) */
  private hostId: string | null = null;
  private nicknames = new Map<string, string>();
  private ready = new Set<string>();
  private phaseTimer: { clear(): void } | null = null;

  onCreate() {
    this.onMessage('start', (client: Client) => this.handleStart(client));
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

  private handleStart(client: Client) {
    if (this.game) return;
    if (client.sessionId !== this.hostId) {
      return client.send('rejected', { reason: '방장만 시작할 수 있다' });
    }
    if (this.clients.length < RULES.minPlayers) {
      return client.send('rejected', { reason: `최소 ${RULES.minPlayers}명이 필요하다` });
    }

    this.game = createInitialState({
      seed: Date.now() & 0x7fffffff,
      players: this.clients.map((c) => ({
        id: c.sessionId,
        nickname: this.nicknames.get(c.sessionId) ?? '플레이어',
      })),
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
    this.broadcast('phase', { phase: this.game.phase, turn: this.game.turn, seconds });
    this.phaseTimer = this.clock.setTimeout(() => this.advance(), seconds * 1000);
  }

  private advance() {
    if (!this.game) return;
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

  /** 전원 준비 완료 시 조기 전환 (준비·채팅 페이즈만) */
  private handleReady(client: Client) {
    // 이벤트 연출도 전원이 '다음'을 누르면 스킵된다 — 타이머는 상한일 뿐이다
    if (!this.game || this.game.phase === 'ended') return;
    this.ready.add(client.sessionId);
    if (this.ready.size >= this.game.players.length) this.advance();
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
      players: this.clients.map((c) => ({
        id: c.sessionId,
        nickname: this.nicknames.get(c.sessionId),
      })),
    });
  }
}
