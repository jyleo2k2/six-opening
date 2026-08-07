'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RULES, type GameView } from 'game';
import { getCompany, getEvent, sectorName } from 'game/data';
import { fmtM, fmtW } from './format';
import type { Settled } from './useGameRoom';

const clip = (px: number) => ({ clipPath: `polygon(${px}px 0,100% 0,100% 100%,0 100%,0 ${px}px)` });

type Stage = 'award' | 'report' | 'return' | 'landing';

/** 종료 시퀀스 — 시상식 → 내 리포트 → 타임머신 귀환 → 오늘의 시장 랜딩 */
export function EndFlow({ view, settled }: { view: GameView; settled: Settled }) {
  const [stage, setStage] = useState<Stage>('award');
  if (stage === 'award') return <AwardScreen settled={settled} onNext={() => setStage('report')} />;
  if (stage === 'report') return <ReportScreen view={view} settled={settled} onNext={() => setStage('return')} />;
  if (stage === 'return') return <ReturnScene onDone={() => setStage('landing')} />;
  return <LandingScreen view={view} />;
}

function AwardScreen({ settled, onNext }: { settled: Settled; onNext: () => void }) {
  const rows = [
    { icon: '🏆', t: '수익왕', d: '최종 자산 1위', tc: '#ffd166', bd: 'rgba(255,209,102,.45)', w: settled.awards.profitKing },
    { icon: '🔍', t: '진실의 눈', d: '가짜 정보에 안 속은 횟수 1위', tc: '#4dc8ff', bd: 'rgba(77,200,255,.4)', w: settled.awards.truthEye },
    { icon: '🛡️', t: '든든이', d: '최대 낙폭 최소 — 잃지 않는 것도 이기는 것', tc: '#35e08c', bd: 'rgba(53,224,140,.4)', w: settled.awards.steady },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 18%,#1c1a33,#05070f 70%)', display: 'flex', flexDirection: 'column', padding: '44px 22px 26px' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <span style={{ fontSize: 9, letterSpacing: 5, color: '#ffd166', fontWeight: 700 }}>AWARDS</span>
        <div style={{ fontWeight: 900, fontSize: 24, marginTop: 4 }}>오늘의 시상식</div>
        <div style={{ fontSize: 11, color: '#8b93a7', marginTop: 3 }}>수익 1등만 상을 받는 게 아니에요</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {rows.map((aw, i) => (
          <div key={aw.t} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'rgba(13,18,32,.88)', border: `1px solid ${aw.bd}`, padding: '14px 16px', animation: 'ykPop .55s ease both', animationDelay: `${i * 0.25}s`, clipPath: 'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)' }}>
            <span style={{ fontSize: 30 }}>{aw.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: aw.tc }}>{aw.t}</div>
              <div style={{ fontSize: 10, color: '#8b93a7', marginTop: 2 }}>{aw.d}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: aw.w.color, color: '#0b1020', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{aw.w.ch}</span>
                <span style={{ fontWeight: 900, fontSize: 13.5 }}>{aw.w.nickname}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 13, color: '#8b93a7', marginTop: 3 }}>{aw.w.value}</div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={onNext} style={{ marginTop: 'auto', textAlign: 'center', fontWeight: 900, fontSize: 15, padding: '14px 0', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg,#37b6ff,#4dd6ff)', color: '#06101f', clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' }}>
        오늘의 나 보기
      </button>
    </div>
  );
}

function ReportScreen({ view, settled, onNext }: { view: GameView; settled: Settled; onNext: () => void }) {
  const me = view.me;
  const myRow = settled.standings.find((s) => s.playerId === me.id)!;
  const cards = [
    { label: '최종 순위', value: `${myRow.rank}위 / ${settled.standings.length}명`, color: '#4dc8ff' },
    { label: '총자산 · 수익률', value: fmtM(myRow.totalAsset), sub: `${myRow.returnPct >= 0 ? '+' : ''}${myRow.returnPct.toFixed(1)}%`, subColor: myRow.returnPct >= 0 ? '#ff5c6e' : '#5aa9ff' },
    { label: '🔍 안 속은 횟수', value: `${me.notFooled}회`, color: '#ffd166' },
    { label: '🛡️ 최대 낙폭', value: `${(me.maxDrawdown * 100).toFixed(1)}%`, color: '#35e08c' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#070a14', display: 'flex', flexDirection: 'column', padding: '34px 20px 24px', overflow: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 9, letterSpacing: 4, color: '#4dc8ff', fontWeight: 700 }}>MY REPORT</span>
        <div style={{ fontWeight: 900, fontSize: 23, marginTop: 3 }}>오늘의 나</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: 'rgba(13,18,32,.88)', border: '1px solid rgba(120,170,255,.18)', padding: 12, ...clip(10) }}>
            <div style={{ fontSize: 9.5, color: '#7d87a3' }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: c.sub ? 18 : 24, color: c.color ?? '#fff', marginTop: 4 }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 11, fontWeight: 700, color: c.subColor }}>{c.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 900, color: '#8b93a7', marginBottom: 7 }}>왜 오르고 떨어졌는지 — 이번 판의 사건들</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {view.eventLog.map((applied) => {
          const event = getEvent(applied.eventId);
          const note = Object.entries(event.imp)
            .sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!))
            .map(([sec, imp]) => `${sectorName(sec as never)} ${imp! > 0 ? '+' : ''}${Math.round(imp! * 100)}%`)
            .join(' · ');
          return (
            <div key={applied.turn} style={{ background: 'rgba(13,18,32,.85)', borderLeft: '2px solid #ff4d6b', padding: '9px 11px' }}>
              <div style={{ fontWeight: 900, fontSize: 12.5 }}>R{applied.turn} · {event.name}</div>
              <div style={{ fontSize: 10.5, color: '#8b93a7', marginTop: 3, lineHeight: 1.5 }}>{note} — 실제 데이터 기반 밴드</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: '#4dc8ff', fontWeight: 700, marginBottom: 16 }}>
        📖 도감 해금 — 기업 +{me.heldEver.length} · 사건 +{view.eventLog.length}
      </div>
      <button type="button" onClick={onNext} style={{ marginTop: 'auto', textAlign: 'center', fontWeight: 900, fontSize: 15, padding: '14px 0', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg,#37b6ff,#4dd6ff)', color: '#06101f', clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' }}>
        🚀 타임머신 귀환
      </button>
    </div>
  );
}

function ReturnScene({ onDone }: { onDone: () => void }) {
  const [year, setYear] = useState('????');
  useEffect(() => {
    const years = ['2013', '2017', '2021', '2024', '2026'];
    const timers = years.map((y, i) => setTimeout(() => setYear(y), 450 + i * 370));
    timers.push(setTimeout(onDone, 450 + years.length * 370 + 700));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'linear-gradient(180deg,#dfe7f5,#f4f6fb)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 170, height: 170, borderRadius: '50%', border: '1px solid rgba(43,127,255,.3)', position: 'absolute', animation: 'ykSpin 5s linear infinite', borderTopColor: '#2b7fff' }} />
      <div style={{ fontSize: 9, letterSpacing: 5, color: '#2b7fff', fontWeight: 700 }}>RETURNING</div>
      <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 88, letterSpacing: 6, color: '#16203a', textShadow: '0 0 30px rgba(43,127,255,.35)' }}>{year}</div>
      <div style={{ fontSize: 12, color: '#5a6682' }}>오늘로 돌아가는 중…</div>
    </div>
  );
}

/** 귀환 착륙 — 게임에서 만난 회사, 오늘은? (시연 mock 시세) */
function LandingScreen({ view }: { view: GameView }) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }, []);
  const rows = useMemo(() => {
    const ids = view.me.heldEver.slice(0, 5);
    const source = ids.length > 0 ? ids : ['sec1'];
    return source.map((id, i) => {
      const company = getCompany(id);
      const drift = ((((id.charCodeAt(0) * 7 + i * 13) % 17) - 6) / 100) * 0.6; // mock ±%
      return {
        name: company.name,
        price: fmtW(Math.round(company.basePrice * (1 + drift))),
        chg: `${drift >= 0 ? '▲' : '▼'}${Math.abs(drift * 100).toFixed(1)}%`,
        color: drift >= 0 ? '#d63031' : '#2b7fff',
      };
    });
  }, [view.me.heldEver]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#eef2fa,#f7f8fc)', color: '#1b2233', display: 'flex', flexDirection: 'column', padding: '40px 22px 24px', overflow: 'auto' }}>
      <div style={{ fontSize: 12, color: '#6b7590' }}>☀️ 네가 없는 동안,</div>
      <div style={{ fontWeight: 900, fontSize: 25, marginTop: 2 }}>오늘의 시장은</div>
      <div style={{ fontSize: 11, color: '#8892ab', marginTop: 3 }}>{today} · 시연용 mock 시세</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #dde4f2', borderRadius: 12, padding: '14px 16px', margin: '16px 0 12px', boxShadow: '0 4px 18px rgba(30,50,110,.07)' }}>
        <div>
          <div style={{ fontSize: 10, color: '#8892ab', fontWeight: 700 }}>KOSPI</div>
          <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 26 }}>3,412.87</div>
        </div>
        <span style={{ fontWeight: 900, fontSize: 14, color: '#d63031' }}>▲ 0.82%</span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 900, color: '#6b7590', marginBottom: 7 }}>게임에서 만난 회사들, 지금은</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row) => (
          <div key={row.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e3e9f5', borderRadius: 10, padding: '11px 14px' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{row.name}</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 15 }}>{row.price}</span>
              <span style={{ fontSize: 11, fontWeight: 900, color: row.color }}>{row.chg}</span>
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: '#8892ab', lineHeight: 1.6, marginTop: 12 }}>
        게임 속 등락률은 감이 아니라, 실제 사건 전후 데이터에 변동 밴드를 씌운 값이었어요. 진짜 계좌가 궁금하면 홈 탭에서 만나요.
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 18 }}>
        <Link href="/game" style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: 14, padding: '13px 0', borderRadius: 10, background: '#16203a', color: '#fff' }}>🌙 로비로</Link>
        <Link href="/game/new?mode=quick" style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: 14, padding: '13px 0', borderRadius: 10, background: 'linear-gradient(90deg,#2b7fff,#4dc8ff)', color: '#fff' }}>⚡ 한 판 더</Link>
      </div>
    </div>
  );
}
