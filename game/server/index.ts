/**
 * 게임 서버 부트스트랩 — 2~8인 히스토리 투자 시뮬 룸.
 *
 * stateful 롱커넥션이라 Vercel serverless에 올릴 수 없다 — Fly.io / Railway 별도 배포.
 *   npm run server -w game
 */
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './GameRoom';

const port = Number(process.env.PORT ?? 2567);

const gameServer = new Server({
  transport: new WebSocketTransport(),
});

gameServer.define('kids-kiwoom', GameRoom);

gameServer.listen(port).then(() => {
  console.log(`[game-server] ws://localhost:${port} 에서 대기 중`);
});
