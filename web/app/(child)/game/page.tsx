'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RULES } from 'game';
import { EVENTS } from 'game/data';

/**
 * 게임 로비 — 초대코드 방 (방장이 시작, 2~8인).
 * 랜덤 매칭은 없다: 시연에서 상대가 없으면 발표가 멈춘다 (기술스택 §5).
 */
export default function GameLobbyPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    setNickname(sessionStorage.getItem('kk-nickname') ?? '');
  }, []);

  const saveNickname = () => {
    const name = nickname.trim() || `주주${Math.floor(Math.random() * 90) + 10}`;
    sessionStorage.setItem('kk-nickname', name);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">그때 그 시절 투자 대결</h1>
        <p className="mt-1 text-sm text-neutral-500">
          과거 10년 속으로 들어가 {RULES.minPlayers}~{RULES.maxPlayers}명이 겨뤄요. {RULES.turns}턴
          뒤 자산이 가장 많은 사람이 우승!
        </p>
      </header>

      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={10}
        placeholder="닉네임 (안 쓰면 자동으로 지어줘요)"
        className="h-12 rounded-xl border border-neutral-200 px-4 text-sm"
      />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            saveNickname();
            router.push('/game/new');
          }}
          className="rounded-xl bg-neutral-900 py-4 text-center font-semibold text-white transition active:scale-[0.99]"
        >
          방 만들기
        </button>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="초대코드"
            className="h-12 flex-1 rounded-xl border border-neutral-200 px-4 font-mono text-sm"
          />
          <button
            type="button"
            disabled={!code.trim()}
            onClick={() => {
              saveNickname();
              router.push(`/game/${code.trim()}`);
            }}
            className="rounded-xl border border-neutral-300 px-5 font-semibold transition active:scale-[0.99] disabled:opacity-40"
          >
            입장
          </button>
        </div>
      </div>

      <section className="rounded-xl bg-neutral-50 p-4">
        <h2 className="text-sm font-semibold">이번 판에 터질 수 있는 사건들</h2>
        <p className="mt-1 text-xs text-neutral-500">
          2011~2020년에 실제로 있었던 일이에요. 판마다 {RULES.turns}개가 몰래 뽑히고, 순서는
          역사와 달라요.
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

      <p className="px-1 text-[11px] leading-relaxed text-neutral-400">
        게임 속 회사는 모두 가상의 회사예요. 진짜 주식이 궁금하면 도감과 내 계좌 탭에서 만나요.
      </p>
    </div>
  );
}
