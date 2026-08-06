import { MACRO_EVENTS } from 'game/data';
import Link from 'next/link';

/**
 * 게임 로비.
 * TODO(T2): 매칭 방식 미확정. 시연에서는 초대코드 방을 추천한다 —
 *   랜덤 매칭은 상대가 없으면 발표가 멈춘다.
 */
export default function GameLobbyPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">투자 대결</h1>
        <p className="mt-1 text-sm text-neutral-500">
          5라운드 동안 더 많이 불린 사람이 이겨요.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Link
          href="/game/demo"
          className="rounded-xl bg-neutral-900 py-4 text-center font-semibold text-white transition active:scale-[0.99]"
        >
          방 만들기
        </Link>
        <Link
          href="/game/deck"
          className="rounded-xl border border-neutral-300 py-4 text-center font-semibold transition active:scale-[0.99]"
        >
          내 덱 편집 (30장)
        </Link>
      </div>

      <section className="rounded-xl bg-neutral-50 p-4">
        <h2 className="text-sm font-semibold">이번에 나올 수 있는 경제환경</h2>
        <p className="mt-1 text-xs text-neutral-500">
          라운드마다 하나씩 발동돼요. 실제로 있었던 일들이에요.
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {MACRO_EVENTS.map((event) => (
            <li
              key={event.id}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                event.tone === 'bad' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {event.name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
