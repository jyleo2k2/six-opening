import { CloseCode, Room, type Client } from 'colyseus';
import { createInitialState, reduce, settle, type Action, type GameState } from '../src/index';

/**
 * PvP 룸 — **권위 판정자**.
 *
 * 클라(web)와 완전히 같은 reduce()를 호출한다. 클라는 UI를 즉시 반응시키려고 미리 돌리고,
 * 최종 진실은 여기서 나온 상태다. 판정 로직을 여기에 따로 구현하지 말 것.
 *
 * 상태는 @colyseus/schema 대신 JSON 전체를 broadcast한다. 턴제라 초당 수십 회 갱신될 일이
 * 없고, 상태가 작아서 델타 동기화의 이점보다 룰 엔진 타입을 그대로 쓰는 이점이 크다.
 */
export interface JoinOptions {
  nickname?: string;
}

const RECONNECT_SECONDS = 60;

export class GameRoom extends Room {
  maxClients = 2;

  private game: GameState | null = null;
  /** sessionId → 좌석(0=선공, 1=후공) */
  private seats = new Map<string, 0 | 1>();

  onCreate() {
    this.onMessage('action', (client: Client, action: Action) => {
      this.handleAction(client, action);
    });
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const seat = this.seats.size as 0 | 1;
    this.seats.set(client.sessionId, seat);

    client.send('seat', { seat, nickname: options.nickname ?? `플레이어${seat + 1}` });

    if (this.seats.size === 2) {
      // TODO(T2): 매칭 방식 확정 전까지 2인이 차면 바로 시작한다.
      //   초대코드 방으로 가면 방장이 시작을 누르는 흐름으로 바뀐다.
      this.game = createInitialState({
        seed: Date.now() & 0x7fffffff,
        playerIds: [...this.seats.keys()] as [string, string],
      });
      this.broadcastState();
    }
  }

  /**
   * 예기치 못한 연결 끊김 — WebView 백그라운드 전환이 실사용 최대 이슈다 (기술스택 §6.1).
   * 스스로 나간 경우(CONSENTED)가 아니면 재접속을 기다린다.
   */
  async onDrop(client: Client, code?: number) {
    if (code === CloseCode.CONSENTED || !this.game || this.game.finished) return;

    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
    } catch {
      this.broadcast('opponent-left', {});
    }
  }

  /** 돌아온 클라이언트에게 좌석과 현재 상태를 다시 밀어준다 */
  onReconnect(client: Client) {
    client.send('seat', { seat: this.seats.get(client.sessionId) });
    this.broadcastState();
  }

  private handleAction(client: Client, action: Action) {
    if (!this.game) return client.send('rejected', { reason: '아직 게임이 시작되지 않았다' });

    const seat = this.seats.get(client.sessionId);
    if (seat === undefined) return;
    if (seat !== this.game.current) {
      return client.send('rejected', { reason: '내 턴이 아니다' });
    }

    const result = reduce(this.game, action);
    if (!result.ok) {
      return client.send('rejected', { reason: result.reason, action });
    }

    this.game = result.value;
    this.broadcastState();

    if (this.game.finished) {
      this.broadcast('settled', settle(this.game));
    }
  }

  private broadcastState() {
    this.broadcast('state', this.game);
  }
}
