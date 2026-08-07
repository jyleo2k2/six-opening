'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CHAT_VERBS, EMOTE_ICON, EMOTES, RULES, type ChatVerb, type GameView, type Sector } from 'game';
import { COMPANIES, getCompany, getEvent, SECTOR_INFOS, sectorInfo } from 'game/data';
import { fmtM, pctColor, pctStr } from './format';
import type { ChatLine, EmoteEvent, GameRoomApi } from './useGameRoom';

const clip = (px: number) => ({ clipPath: `polygon(${px}px 0,100% 0,100% 100%,0 100%,0 ${px}px)` });

const PHASE_NAMES = [
  ['prep', '① 준비'],
  ['chat', '② 회의'],
  ['event', '③ 사건'],
  ['rank', '④ 순위'],
] as const;

export function TopBar({ view, secondsLeft, totalSeconds, onReady, readySent }: { view: GameView; secondsLeft: number | null; totalSeconds: number; onReady: () => void; readySent: boolean }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const t = secondsLeft ?? 0;
  return (
    <div>
      <div style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 14, background: 'rgba(77,200,255,.12)', border: '1px solid rgba(77,200,255,.35)', color: '#4dc8ff', padding: '1px 8px', ...clip(6) }}>
          R{view.turn}/{view.turns}
        </span>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {PHASE_NAMES.map(([id, name]) => {
            const active = view.phase === id;
            return (
              <span key={id} style={{ fontSize: 10, fontWeight: active ? 900 : 500, color: active ? '#4dc8ff' : '#5c6682', padding: '2px 5px', borderBottom: `2px solid ${active ? '#4dc8ff' : 'transparent'}` }}>
                {name}
              </span>
            );
          })}
        </div>
        <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 19, color: t <= 10 && t > 0 ? '#ff4d6b' : '#eaf4ff' }}>
          {pad(Math.floor(t / 60))}:{pad(t % 60)}
        </span>
        <button type="button" onClick={onReady} disabled={readySent} style={{ fontSize: 11, color: readySent ? '#3a4152' : '#5c6682', border: '1px solid rgba(120,170,255,.18)', borderRadius: 5, padding: '2px 6px', background: 'transparent', cursor: 'pointer' }}>
          ⏭
        </button>
      </div>
      <div style={{ height: 2, margin: '0 12px', background: 'rgba(120,170,255,.12)' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#4dc8ff,#37b6ff)', width: `${totalSeconds ? Math.round((t / totalSeconds) * 100) : 0}%`, transition: 'width 1s linear', boxShadow: '0 0 8px rgba(77,200,255,.7)' }} />
      </div>
    </div>
  );
}

export function BottomBar({ view }: { view: GameView }) {
  const me = view.me;
  const myRow = view.standings.find((s) => s.playerId === me.id)!;
  const evalValue = myRow.totalAsset - me.cash;
  return (
    <div style={{ display: 'flex', borderTop: '1px solid rgba(120,170,255,.14)', background: 'rgba(8,11,20,.95)', padding: '9px 14px 13px', gap: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: '#7d87a3' }}>💵 현금</div>
        <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 17 }}>{fmtM(me.cash)}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: '#7d87a3' }}>📈 평가액</div>
        <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 17 }}>{fmtM(evalValue)}</div>
      </div>
      <div style={{ flex: 1.2, textAlign: 'right' }}>
        <div style={{ fontSize: 9, color: '#7d87a3' }}>합계 · <span style={{ color: '#4dc8ff' }}>{myRow.rank}위</span></div>
        <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 19, color: myRow.totalAsset >= RULES.seedCash ? '#ff8fa3' : '#8fc4ff' }}>{fmtM(myRow.totalAsset)}</div>
      </div>
    </div>
  );
}

/** S4 시장 — 섹터 타일 8 + 내 뉴스/정보소 진입 + 구매 공개 피드 */
export function MarketScreen({ view, onOpenNews, onOpenShop, onOpenSector }: { view: GameView; onOpenNews: () => void; onOpenShop: () => void; onOpenSector: (sector: Sector) => void }) {
  const me = view.me;
  const nickOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of view.standings) map.set(s.playerId, s.nickname);
    return map;
  }, [view.standings]);

  const purchases = view.purchases.filter((p) => p.turn === view.turn);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: '10px 12px 8px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={onOpenNews} style={{ flex: 1, background: 'rgba(13,18,32,.85)', border: '1px solid rgba(255,209,102,.35)', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', color: '#fff', ...clip(8) }}>
          <span style={{ fontSize: 15 }}>📰</span>
          <span style={{ fontWeight: 700, fontSize: 12, color: '#ffd166' }}>내 뉴스</span>
        </button>
        <button type="button" onClick={onOpenShop} style={{ flex: 1.4, background: 'rgba(13,18,32,.85)', border: '1px solid rgba(77,200,255,.35)', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', color: '#fff', ...clip(8) }}>
          <span style={{ fontSize: 15 }}>🛰</span>
          <span style={{ fontWeight: 700, fontSize: 12, color: '#4dc8ff' }}>정보소</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#8b93a7' }}>남은 {me.infoLeft}회</span>
        </button>
      </div>

      {me.intel.filter((iv) => iv.turn === view.turn).slice(-2).map((iv, i) => (
        <div key={i} style={{ background: 'rgba(20,26,44,.8)', borderLeft: '2px solid #4dc8ff', padding: '6px 9px', marginBottom: 6, fontSize: 10.5, lineHeight: 1.5, color: '#c9d2e8' }}>
          {['🥉', '🥈', '🥇'][iv.tier - 1]} {iv.text}
        </div>
      ))}
      {purchases.length > 0 && (
        <div style={{ fontSize: 10, color: '#8b93a7', marginBottom: 6 }}>
          🛰 {purchases.map((p) => `${p.playerId === me.id ? '나' : (nickOf.get(p.playerId) ?? '?')}: ${['🥉', '🥈', '🥇'][p.tier - 1]}${p.tab === 'scout' ? '정찰' : '해설'}`).join(' · ')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SECTOR_INFOS.map((sc) => {
          const stocks = COMPANIES.filter((c) => c.sector === sc.id);
          const chg = stocks.reduce((a, s) => a + (view.prices[s.id] - s.basePrice) / s.basePrice, 0) / stocks.length;
          const myValue = stocks.reduce((a, s) => a + (me.holdings.find((h) => h.companyId === s.id)?.qty ?? 0) * view.prices[s.id], 0);
          const holders = [
            ...(myValue > RULES.dustValue ? [{ id: me.id, color: view.standings.find((s) => s.playerId === me.id)!.color, ch: '나' }] : []),
            ...view.others.filter((o) => o.heldSectors.includes(sc.id)).map((o) => ({ id: o.id, color: o.color, ch: o.ch })),
          ];
          return (
            <button key={sc.id} type="button" onClick={() => onOpenSector(sc.id)} style={{ position: 'relative', textAlign: 'left', background: 'rgba(13,18,32,.85)', border: `1px solid ${myValue > RULES.dustValue ? 'rgba(77,200,255,.5)' : 'rgba(120,170,255,.16)'}`, padding: '10px 11px', minHeight: 96, cursor: 'pointer', color: '#fff', clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 17 }}>{sc.emoji}</span>
                <span style={{ fontWeight: 900, fontSize: 13 }}>{sc.name}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 20, color: pctColor(chg), marginTop: 5 }}>{pctStr(chg)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 7, minHeight: 16 }}>
                {holders.map((h) => (
                  <span key={h.id} style={{ width: 15, height: 15, borderRadius: 4, background: h.color, color: '#0b1020', fontSize: 8.5, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{h.ch}</span>
                ))}
                {myValue > RULES.dustValue && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 11, color: '#4dc8ff' }}>{fmtM(myValue)}</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: '#5c6682', textAlign: 'center', margin: '10px 0 4px' }}>안 사는 것도 전략 — 무행동 페널티는 없어요</div>
    </div>
  );
}

/** S7 작전 회의 — 템플릿 3단 조합 채팅 */
export function ChatScreen({ view, room, chats }: { view: GameView; room: GameRoomApi; chats: ChatLine[] }) {
  const [c1, setC1] = useState<string | null>(null);
  const [c2, setC2] = useState<Sector | null>(null);
  const [c3, setC3] = useState<ChatVerb | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [chats.length]);

  const subjects = ['나는', '얘들아', ...view.others.map((o) => o.nickname)];
  const canSend = c1 && c2 && c3;
  const chip = (active: boolean) => ({
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    background: active ? 'rgba(77,200,255,.18)' : 'rgba(255,255,255,.04)',
    color: active ? '#4dc8ff' : '#aeb8d2',
    border: `1px solid ${active ? 'rgba(77,200,255,.5)' : 'rgba(120,170,255,.14)'}`,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '8px 12px 10px' }}>
      <div style={{ fontSize: 10, color: '#8b93a7', textAlign: 'center', marginBottom: 6 }}>
        💬 작전 회의 — 템플릿으로만 말할 수 있어요 · 거짓말도 전술입니다
      </div>
      <div ref={logRef} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 7, padding: '4px 0' }}>
        {chats.slice(-40).map((m) => {
          const mine = m.playerId === view.me.id;
          return (
            <div key={m.id} style={{ display: 'flex', gap: 7, flexDirection: mine ? 'row-reverse' : 'row' }}>
              <span style={{ flex: 'none', width: 26, height: 26, borderRadius: 7, background: m.color, color: '#0b1020', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.ch}</span>
              <div style={{ maxWidth: '75%' }}>
                <div style={{ fontSize: 9, color: '#7d87a3', margin: '0 2px 2px' }}>{mine ? '나' : m.nickname}</div>
                <div style={{ background: mine ? 'rgba(77,200,255,.13)' : 'rgba(20,26,44,.85)', border: `1px solid ${mine ? 'rgba(77,200,255,.4)' : 'rgba(120,170,255,.14)'}`, padding: '7px 10px', fontSize: 12, lineHeight: 1.5, ...clip(8) }}>{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background: 'rgba(13,18,32,.9)', border: '1px solid rgba(120,170,255,.18)', padding: 9, ...clip(10) }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
          {subjects.map((s) => (
            <button key={s} type="button" onClick={() => setC1(s)} style={{ ...chip(c1 === s), borderStyle: 'solid' }}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
          {SECTOR_INFOS.map((sc) => (
            <button key={sc.id} type="button" onClick={() => setC2(sc.id)} style={chip(c2 === sc.id)}>{sc.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 7 }}>
          {CHAT_VERBS.map((v) => (
            <button key={v} type="button" onClick={() => setC3(v)} style={chip(c3 === v)}>{v}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => {
              if (!canSend) return;
              room.chat(c1!, c2!, c3!);
              setC1(null); setC2(null); setC3(null);
            }}
            style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: 13, padding: '9px 0', border: 'none', cursor: canSend ? 'pointer' : 'default', background: canSend ? 'linear-gradient(90deg,#37b6ff,#4dd6ff)' : 'rgba(255,255,255,.06)', color: canSend ? '#06101f' : '#5c6682', ...clip(8) }}
          >
            보내기
          </button>
          <button type="button" onClick={room.shareNews} style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '9px 0', background: 'rgba(255,209,102,.12)', color: '#ffd166', border: '1px solid rgba(255,209,102,.4)', cursor: 'pointer', ...clip(8) }}>
            📰 내 뉴스 공유
          </button>
          {(['laugh', 'fire'] as const).map((e) => (
            <button key={e} type="button" onClick={() => room.emote(e)} style={{ fontSize: 17, background: 'transparent', border: 'none', cursor: 'pointer' }}>{EMOTE_ICON[e]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** S8 사건 연출 — 속보 → 사건 카드 → 섹터 게이지 → 내 손익 */
export function EventScreen({ view, onReady, readySent }: { view: GameView; onReady: () => void; readySent: boolean }) {
  const [step, setStep] = useState(0);
  const applied = view.eventLog.at(-1);

  useEffect(() => {
    setStep(0);
    const timers = [setTimeout(() => setStep(1), 1400), setTimeout(() => setStep(2), 3600), setTimeout(() => setStep(3), 6600)];
    return () => timers.forEach(clearTimeout);
  }, [view.turn]);

  if (!applied) return null;
  const event = getEvent(applied.eventId);

  const sectorPct = SECTOR_INFOS.map((sc) => {
    const stocks = COMPANIES.filter((c) => c.sector === sc.id);
    const pct = stocks.reduce((a, s) => a + (applied.changes[s.id]?.pct ?? 0), 0) / stocks.length;
    const mine = view.me.holdings.some((h) => getCompany(h.companyId).sector === sc.id);
    return { ...sc, pct, mine };
  });

  const myDelta = view.me.holdings.reduce((a, h) => {
    const change = applied.changes[h.companyId];
    return change ? a + (change.after - change.before) * h.qty : a;
  }, 0);
  const myTotal = view.standings.find((s) => s.playerId === view.me.id)!.totalAsset;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#04050a', display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
      {step === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: 6, color: '#ff4d6b', border: '1.5px solid #ff4d6b', padding: '6px 18px', animation: 'ykSiren .5s linear infinite' }}>⚠ 속 보</div>
          <div style={{ fontSize: 11, color: '#5c6682' }}>그 시절, 무슨 일이 벌어지고 있습니다…</div>
        </div>
      )}
      {step >= 1 && (
        <div style={{ animation: 'ykPop .45s ease both', background: 'linear-gradient(150deg,#171d33,#0c101f)', border: '1px solid rgba(255,77,107,.4)', padding: '16px 16px 13px', marginBottom: 10, clipPath: 'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ background: '#ff4d6b', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 2 }}>EVENT</span>
            <span style={{ fontSize: 9.5, color: '#ffb3c1' }}>✓ 실제로 있었던 일이에요</span>
          </div>
          <div style={{ fontWeight: 900, fontSize: 25, marginTop: 8, lineHeight: 1.25 }}>{event.name}</div>
          <div style={{ fontSize: 12, color: '#aeb8d2', marginTop: 4 }}>{event.subtitle}</div>
          <div style={{ fontSize: 9.5, color: '#5c6682', marginTop: 8 }}>관찰 구간 {event.window} · 실제 등락률 × 변동 밴드({RULES.bandMin}~{RULES.bandMax})</div>
        </div>
      )}
      {step >= 2 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, justifyContent: 'center' }}>
          {sectorPct.map((sc) => {
            const up = sc.pct >= 0;
            const width = Math.max(Math.min(115, Math.abs(sc.pct * 100) * 6.5), 2);
            return (
              <div key={sc.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ flex: 'none', width: 92, fontSize: 11, fontWeight: 700, color: '#c9d2e8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{sc.emoji}</span>{sc.name}
                  {sc.mine && <span style={{ width: 12, height: 12, borderRadius: 3, background: '#4dc8ff', color: '#0b1020', fontSize: 7.5, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>나</span>}
                </span>
                <div style={{ flex: 1, height: 14, display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'rgba(120,170,255,.25)' }} />
                  <div style={{ position: 'absolute', height: 11, transition: 'width 1.1s cubic-bezier(.2,.8,.2,1)', width, left: up ? '50%' : 'auto', right: up ? 'auto' : '50%', background: up ? 'linear-gradient(90deg,#ff5c6e,#ff8fa3)' : 'linear-gradient(270deg,#5aa9ff,#8fc4ff)', boxShadow: `0 0 9px ${up ? 'rgba(255,92,110,.5)' : 'rgba(90,169,255,.5)'}` }} />
                </div>
                <span style={{ flex: 'none', width: 52, textAlign: 'right', fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 14, color: up ? '#ff5c6e' : '#5aa9ff' }}>{pctStr(sc.pct)}</span>
              </div>
            );
          })}
        </div>
      )}
      {step >= 3 && (
        <div style={{ animation: 'ykPop .4s ease both', background: 'rgba(13,18,32,.92)', border: '1px solid rgba(120,170,255,.25)', padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...clip(12) }}>
          <div>
            <div style={{ fontSize: 10, color: '#8b93a7' }}>이번 사건, 내 손익</div>
            <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 27, color: myDelta >= 0 ? '#ff5c6e' : '#5aa9ff' }}>{myDelta >= 0 ? '+' : '−'}{fmtM(Math.abs(myDelta))}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#8b93a7' }}>총자산</div>
            <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 19 }}>{fmtM(myTotal)}</div>
          </div>
        </div>
      )}
      <button type="button" onClick={onReady} disabled={readySent} style={{ marginTop: 10, textAlign: 'center', fontWeight: 900, fontSize: 13, padding: '11px 0', border: 'none', cursor: 'pointer', background: readySent ? 'rgba(255,255,255,.06)' : 'rgba(77,200,255,.15)', color: readySent ? '#5c6682' : '#4dc8ff', ...clip(10) }}>
        {readySent ? '다른 친구들을 기다리는 중…' : '다음 ▶'}
      </button>
    </div>
  );
}

/** S9 순위 — 등락 화살표 + 이모지 파티 */
export function RankScreen({ view, prevRanks, emotes, room, secondsLeft }: { view: GameView; prevRanks: Record<string, number> | null; emotes: EmoteEvent[]; room: GameRoomApi; secondsLeft: number | null }) {
  const final = view.turn >= view.turns;
  const maxTotal = view.standings[0].totalAsset;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '12px 14px 10px', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: 4, color: '#4dc8ff', fontWeight: 700 }}>RANKING</span>
        <div style={{ fontWeight: 900, fontSize: 19 }}>{final ? '최종 순위' : `라운드 ${view.turn} 순위`}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {view.standings.map((row, i) => {
          const mine = row.playerId === view.me.id;
          const prev = prevRanks?.[row.playerId];
          const delta = prev ? prev - row.rank : 0;
          return (
            <div key={row.playerId} style={{ display: 'flex', alignItems: 'center', gap: 10, background: mine ? 'rgba(77,200,255,.08)' : 'rgba(13,18,32,.85)', border: `1px solid ${mine ? 'rgba(77,200,255,.5)' : 'rgba(120,170,255,.14)'}`, padding: '11px 13px', animation: 'ykPop .5s ease both', animationDelay: `${i * 0.12}s`, clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' }}>
              <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 23, width: 26, color: row.rank === 1 ? '#ffd166' : '#8b93a7' }}>{row.rank}</span>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: row.color, color: '#0b1020', fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.ch}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 13.5 }}>{mine ? `${row.nickname} (나)` : row.nickname}</div>
                <div style={{ height: 4, background: 'rgba(120,170,255,.12)', borderRadius: 2, marginTop: 5 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: mine ? 'linear-gradient(90deg,#37b6ff,#4dd6ff)' : 'rgba(140,150,180,.5)', width: `${Math.round((row.totalAsset / maxTotal) * 100)}%`, transition: 'width 1s ease' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 16 }}>{fmtM(row.totalAsset)}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: row.returnPct >= 0 ? '#ff5c6e' : '#5aa9ff' }}>
                  {row.returnPct >= 0 ? '+' : ''}{row.returnPct.toFixed(1)}% {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : '−'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <FloatingEmotes emotes={emotes} />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '10px 0 4px' }}>
        {EMOTES.map((e) => (
          <button key={e} type="button" onClick={() => room.emote(e)} style={{ fontSize: 24, background: 'transparent', border: 'none', cursor: 'pointer', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))' }}>{EMOTE_ICON[e]}</button>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 10, color: '#5c6682' }}>
        {final ? '잠시 후 시상식이 열립니다' : `다음 라운드까지 ${secondsLeft ?? '-'}초`}
      </div>
    </div>
  );
}

export function FloatingEmotes({ emotes }: { emotes: EmoteEvent[] }) {
  const recent = emotes.slice(-6);
  return (
    <div style={{ position: 'relative', height: 0, pointerEvents: 'none' }}>
      {recent.map((e, i) => (
        <span key={e.id} style={{ position: 'absolute', bottom: 40, left: `${12 + ((e.id * 37) % 70)}%`, fontSize: 26, animation: 'ykFloat 2.2s ease-out both', animationDelay: `${i * 0.05}s` }}>
          {EMOTE_ICON[e.kind]}
        </span>
      ))}
    </div>
  );
}
