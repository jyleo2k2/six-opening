'use client';

import { useMemo, useState } from 'react';
import { RULES, type GameView, type InfoTab } from 'game';
import { COMPANIES, SECTOR_INFOS, sectorInfo } from 'game/data';
import { fmtM, fmtW, pctColor, pctStr } from './format';
import type { GameRoomApi } from './useGameRoom';

const clip = (px: number) => ({ clipPath: `polygon(${px}px 0,100% 0,100% 100%,0 100%,0 ${px}px)` });

/** S3 내 뉴스 카드 — "절반만 진짜 전조" */
export function NewsModal({ view, onClose }: { view: GameView; onClose: () => void }) {
  const news = view.me.news.find((n) => n.turn === view.turn);
  if (!news) return null;
  const info = sectorInfo(news.sector);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(3,4,9,.9)', backdropFilter: 'blur(9px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 26 }}>
      <div style={{ width: '100%', background: 'linear-gradient(160deg,#151c33,#0b0f1e)', border: '1px solid rgba(255,209,102,.45)', padding: '22px 20px', ...clip(16) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, letterSpacing: 3, color: '#ffd166', fontWeight: 700 }}>MY NEWS — 나만 받은 정보</span>
          <span style={{ fontSize: 9, color: '#5c6682' }}>R{view.turn}/{view.turns}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,209,102,.1)', border: '1px solid rgba(255,209,102,.35)', padding: '4px 10px', marginTop: 14, ...clip(6) }}>
          <span>{info.emoji}</span>
          <span style={{ fontWeight: 900, fontSize: 12, color: '#ffd166' }}>{info.name} 섹터</span>
        </div>
        <div style={{ fontWeight: 900, fontSize: 19, lineHeight: 1.55, margin: '14px 0 16px' }}>“{news.text}”</div>
        <div style={{ fontSize: 10.5, lineHeight: 1.6, color: '#8b93a7', borderTop: '1px solid rgba(120,170,255,.14)', paddingTop: 11 }}>
          플레이어마다 다른 뉴스를 받았어요. <b style={{ color: '#ffb3c1' }}>일부만 진짜 전조</b> — 이 뉴스가 진짜인지는 아무도 모릅니다.
        </div>
        <button type="button" onClick={onClose} style={{ width: '100%', marginTop: 16, textAlign: 'center', fontWeight: 900, fontSize: 15, padding: '13px 0', background: 'linear-gradient(90deg,#37b6ff,#4dd6ff)', color: '#06101f', border: 'none', cursor: 'pointer', clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)' }}>
          확인했어
        </button>
      </div>
    </div>
  );
}

/** S6 정보소 — 해설/정찰 2탭, 게임당 2회, 꼴찌 50% 할인 */
export function InfoShop({ view, room, onClose }: { view: GameView; room: GameRoomApi; onClose: () => void }) {
  const [tab, setTab] = useState<InfoTab>('analysis');
  const me = view.me;

  // 할인 표시는 클라 계산(서버가 실가격을 강제한다): 단독 꼴찌면 50%
  const discOn = useMemo(() => {
    const totals = view.standings.map((s) => s.totalAsset);
    const min = Math.min(...totals);
    const mine = view.standings.find((s) => s.playerId === me.id)!.totalAsset;
    return mine === min && totals.some((t) => t > min);
  }, [view, me.id]);

  const defs =
    tab === 'analysis'
      ? ([['🥉', '찌라시', '반쯤 맞는 소문 (정확도 ~50%)'], ['🥈', '리포트', '핵심 하나는 짚습니다 (~75%)'], ['🥇', '보고서', '거의 정확합니다 (~95%)']] as const)
      : ([['🥉', '익명 소문', '누가 뭘 샀다더라… (거짓 가능)'], ['🥈', '1인 정찰', '한 명의 실제 보유'], ['🥇', '전체 정찰', '전원 보유 현황']] as const);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 55, background: 'rgba(3,4,9,.88)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', padding: '18px 14px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 9, letterSpacing: 3, color: '#4dc8ff', fontWeight: 700 }}>INFO DEALER</span>
          <div style={{ fontWeight: 900, fontSize: 20 }}>🛰 정보소</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {discOn && <span style={{ fontSize: 9.5, fontWeight: 900, color: '#35e08c', border: '1px solid rgba(53,224,140,.5)', padding: '2px 7px', borderRadius: 3 }}>하위권 50% 할인</span>}
          <span style={{ fontSize: 10, color: '#8b93a7' }}>남은 <b style={{ color: '#4dc8ff' }}>{me.infoLeft}</b>회</span>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, background: 'rgba(255,255,255,.06)', borderRadius: 8, border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, margin: '12px 0 10px' }}>
        {(['analysis', 'scout'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: 12.5, padding: '8px 0', border: '1px solid rgba(77,200,255,.3)', cursor: 'pointer', background: tab === t ? 'rgba(77,200,255,.16)' : 'rgba(13,18,32,.8)', color: tab === t ? '#4dc8ff' : '#8b93a7', ...clip(8) }}>
            {t === 'analysis' ? '📊 해설 — 어디에 영향 줘?' : '🔭 정찰 — 쟤는 뭘 샀을까?'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {defs.map((df, i) => {
          const tier = (i + 1) as 1 | 2 | 3;
          const price = RULES.infoPrices[i] * (discOn ? RULES.catchupDiscount : 1);
          const can = me.infoLeft > 0 && me.cash >= price;
          return (
            <div key={df[1]} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'rgba(13,18,32,.9)', border: '1px solid rgba(120,170,255,.16)', padding: '11px 13px', opacity: can ? 1 : 0.45, ...clip(12) }}>
              <span style={{ fontSize: 24 }}>{df[0]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 13.5 }}>{df[1]}</div>
                <div style={{ fontSize: 10, color: '#8b93a7', marginTop: 2, lineHeight: 1.4 }}>{df[2]}</div>
              </div>
              <button type="button" disabled={!can} onClick={() => room.buyInfo(tab, tier)} style={{ fontWeight: 900, fontSize: 12, padding: '8px 13px', whiteSpace: 'nowrap', border: 'none', cursor: can ? 'pointer' : 'default', background: can ? 'linear-gradient(90deg,#37b6ff,#4dd6ff)' : 'rgba(255,255,255,.07)', color: can ? '#06101f' : '#5c6682', clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}>
                {fmtM(price)}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: '#8b93a7', margin: '10px 2px 6px' }}>
        구매한 정보 — <span style={{ color: '#ffb3c1' }}>등급은 보여도, 진위는 안 보입니다</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {me.intel.slice().reverse().map((iv, i) => (
          <div key={i} style={{ background: 'rgba(20,26,44,.85)', borderLeft: '2px solid #4dc8ff', padding: '8px 10px', fontSize: 11.5, lineHeight: 1.55, color: '#d5dcee' }}>
            <span style={{ marginRight: 5 }}>{['🥉', '🥈', '🥇'][iv.tier - 1]}</span>
            {iv.text}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#5c6682', textAlign: 'center', paddingTop: 8 }}>
        공짜 정보는 없고, 싼 정보는 대개 틀리고, 비싼 정보도 100%는 아닙니다
      </div>
    </div>
  );
}

/** S5 매수/매도 시트 — 금액 슬라이더(만원 단위) → 소수점 주식 */
export function TradeSheet({ view, room, sectorId, onClose }: { view: GameView; room: GameRoomApi; sectorId: string; onClose: () => void }) {
  const info = sectorInfo(sectorId as never);
  const stocks = COMPANIES.filter((c) => c.sector === sectorId);
  const [selected, setSelected] = useState(stocks[0].id);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amt, setAmt] = useState(100_000);

  const me = view.me;
  const price = view.prices[selected];
  const holding = me.holdings.find((h) => h.companyId === selected);
  const maxV = mode === 'buy' ? me.cash : (holding?.qty ?? 0) * price;
  const amount = Math.min(amt, Math.max(0, Math.floor(maxV)));
  const can = amount >= RULES.minTradeAmount;

  const presets = [
    { l: '10만', v: 100_000 },
    { l: '20만', v: 200_000 },
    { l: '50만', v: 500_000 },
    { l: '전액', v: Math.floor(maxV) },
  ];

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(3,4,9,.6)' }} onClick={onClose} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 51, background: '#0d1220', borderTop: '1px solid rgba(77,200,255,.35)', boxShadow: '0 -18px 50px rgba(0,0,0,.6)', padding: '16px 16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{info.emoji}</span>
            <span style={{ fontWeight: 900, fontSize: 17 }}>{info.name}</span>
          </div>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, background: 'rgba(255,255,255,.06)', borderRadius: 8, border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {stocks.map((stock) => {
            const sel = selected === stock.id;
            const chg = (view.prices[stock.id] - stock.basePrice) / stock.basePrice;
            const pos = (me.holdings.find((h) => h.companyId === stock.id)?.qty ?? 0) * view.prices[stock.id];
            return (
              <button key={stock.id} type="button" onClick={() => setSelected(stock.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: sel ? 'rgba(77,200,255,.1)' : 'rgba(20,26,44,.7)', border: `1px solid ${sel ? '#4dc8ff' : 'rgba(120,170,255,.14)'}`, padding: '10px 12px', cursor: 'pointer', color: '#fff', ...clip(10) }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{stock.name}</div>
                  <div style={{ fontSize: 9.5, color: '#8b93a7', marginTop: 2 }}>{stock.blurb}</div>
                  {pos > 100 && <div style={{ fontSize: 10, color: '#4dc8ff', fontWeight: 700, marginTop: 3 }}>보유 {fmtM(pos)}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 16 }}>{fmtW(view.prices[stock.id])}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: pctColor(chg) }}>{pctStr(chg)}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 11 }}>
          <button type="button" onClick={() => setMode('buy')} style={{ flex: 1, fontWeight: 900, fontSize: 13, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', background: mode === 'buy' ? '#ff5c6e' : 'rgba(255,255,255,.05)', color: mode === 'buy' ? '#fff' : '#8b93a7' }}>매수</button>
          <button type="button" onClick={() => setMode('sell')} style={{ flex: 1, fontWeight: 900, fontSize: 13, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', background: mode === 'sell' ? '#5aa9ff' : 'rgba(255,255,255,.05)', color: mode === 'sell' ? '#06101f' : '#8b93a7' }}>매도</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {presets.map((pr) => (
            <button key={pr.l} type="button" onClick={() => setAmt(Math.floor(pr.v / RULES.tradeStep) * RULES.tradeStep)} style={{ flex: 1, fontWeight: 700, fontSize: 12, padding: '7px 0', border: '1px solid rgba(120,170,255,.25)', borderRadius: 6, cursor: 'pointer', background: Math.abs(amount - pr.v) < 5000 ? 'rgba(77,200,255,.18)' : 'transparent', color: Math.abs(amount - pr.v) < 5000 ? '#4dc8ff' : '#aeb8d2' }}>
              {pr.l}
            </button>
          ))}
        </div>

        <input type="range" min={0} max={Math.max(Math.floor(maxV / RULES.tradeStep) * RULES.tradeStep, RULES.tradeStep)} step={RULES.tradeStep} value={amount} onChange={(e) => setAmt(parseInt(e.target.value, 10) || 0)} style={{ width: '100%' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '9px 0 13px' }}>
          <span style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 25, color: '#4dc8ff' }}>{fmtM(amount)}</span>
          <span style={{ fontSize: 12, color: '#8b93a7' }}>≈ <b style={{ color: '#e8edf7' }}>{(amount / price).toFixed(1)}</b>주</span>
        </div>
        <button
          type="button"
          disabled={!can}
          onClick={() => {
            if (mode === 'buy') room.buy(selected, amount);
            else room.sell(selected, amount);
            onClose();
          }}
          style={{ width: '100%', textAlign: 'center', fontWeight: 900, fontSize: 15, padding: '13px 0', border: 'none', cursor: can ? 'pointer' : 'default', background: can ? (mode === 'buy' ? 'linear-gradient(90deg,#ff5c6e,#ff8fa3)' : 'linear-gradient(90deg,#5aa9ff,#8fc4ff)') : 'rgba(255,255,255,.06)', color: can ? '#06101f' : '#5c6682', clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)' }}
        >
          {mode === 'buy' ? '매수하기' : '매도하기'} · {fmtM(amount)}
        </button>
      </div>
    </>
  );
}

/** 섹터 도감 — "이기고 싶으면 도감부터" (로비·게임 공용) */
export function CodexOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(4,6,12,.92)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', padding: '18px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 9, letterSpacing: 3, color: '#4dc8ff', fontWeight: 700 }}>CODEX</span>
          <div style={{ fontWeight: 900, fontSize: 20 }}>섹터 도감</div>
        </div>
        <button type="button" onClick={onClose} style={{ width: 34, height: 34, background: 'rgba(255,255,255,.06)', borderRadius: 8, border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ fontSize: 11, color: '#8b93a7', marginBottom: 12 }}>사건이 터지면 어떤 섹터가 움직일까? 게임 전에 예습하세요.</div>
      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
        {SECTOR_INFOS.map((sc) => (
          <div key={sc.id} style={{ background: 'rgba(13,18,32,.85)', border: '1px solid rgba(120,170,255,.16)', padding: 10, ...clip(10) }}>
            <div style={{ fontSize: 20 }}>{sc.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: 13.5, margin: '3px 0 6px' }}>{sc.name}</div>
            <div style={{ fontSize: 10, lineHeight: 1.45, color: '#ffb3c1' }}>▲ {sc.up}</div>
            <div style={{ fontSize: 10, lineHeight: 1.45, color: '#8fc4ff', marginTop: 3 }}>▼ {sc.down}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
