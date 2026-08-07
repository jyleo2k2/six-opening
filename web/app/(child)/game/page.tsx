import { RULES } from 'game';
import { EVENTS } from 'game/data';
import Link from 'next/link';

/**
 * 게임 로비 — 초대코드 방 (방장이 시작, 2~8인).
 * 랜덤 매칭은 없다: 시연에서 상대가 없으면 발표가 멈춘다 (기술스택 §5).
 */
export default function GameLobbyPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">그때 그 시절 투자 대결</h1>
        <p className="mt-1 text-sm text-neutral-500">
          과거 10년 속으로 들어가 {RULES.minPlayers}~{RULES.maxPlayers}명이 겨뤄요. 5턴 뒤 자산이
          가장 많은 사람이 우승!
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
          href="/game/demo"
          className="rounded-xl border border-neutral-300 py-4 text-center font-semibold transition active:scale-[0.99]"
        >
          초대코드로 입장
        </Link>
      </div>

      <section className="rounded-xl bg-neutral-50 p-4">
        <h2 className="text-sm font-semibold">이번 판에 터질 수 있는 사건들</h2>
        <p className="mt-1 text-xs text-neutral-500">
          2011~2020년에 실제로 있었던 일이에요. 판마다 5개가 몰래 뽑히고, 순서는 역사와 달라요.
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {EVENTS.map((event) => (
            <li
              key={event.id}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                event.tone === 'bad'
                  ? 'bg-blue-50 text-blue-600'
                  : event.tone === 'good'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-700'
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
