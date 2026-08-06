import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot as BotIcon,
  ChevronsRight,
  Coins,
  Eye,
  Flag,
  Newspaper,
  RotateCcw,
  Star,
  Swords,
  Zap,
} from 'lucide-react';
import { CARDS } from '@engine/cards.ts';
import { DIFFICULTY_TIERS, type DifficultyTier } from '@engine/difficulty.ts';
import { assets, holdingsValue } from '@engine/engine.ts';
import type { CardId, GameState, Stock } from '@engine/types.ts';
import { CARD_TOOLTIP, KIND_LABEL, cardEffectText } from './cardMeta.ts';
import { describeEvents } from './eventMessages.ts';
import { manwon, pct, signedManwon, won } from './format.ts';
import { rankForGold } from './progression.ts';
import { useMatch, type CostBasis, type MatchSettlement, type RoundReport } from './useMatch.ts';

declare global {
  interface Window {
    __match?: {
      game: GameState;
      history: Record<string, number[]>;
      costBasis: CostBasis;
      report: RoundReport | null;
      settlement: MatchSettlement | null;
      difficulty: DifficultyTier;
    };
  }
}

const KIND_CLASS: Record<string, string> = {
  action: 'kind-action',
  event: 'kind-event',
  trap: 'kind-trap',
  fun: 'kind-fun',
  illegal: 'kind-illegal',
};

/** 시세가 바뀌면 잠깐 상승/하락 색으로 번쩍이는 클래스를 돌려준다. */
function usePriceFlash(price: number): string {
  const prev = useRef(price);
  const [flash, setFlash] = useState('');
  useEffect(() => {
    if (prev.current === price) return;
    setFlash(price > prev.current ? 'flash-up' : 'flash-down');
    prev.current = price;
    const t = setTimeout(() => setFlash(''), 700);
    return () => clearTimeout(t);
  }, [price]);
  return flash;
}

function Sparkline({ points }: { points: number[] }) {
  const d = useMemo(() => {
    if (points.length < 2) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * 60;
        const y = 20 - ((p - min) / span) * 16 - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [points]);
  if (!d) return <svg className="spark" viewBox="0 0 60 20" />;
  const up = points[points.length - 1] >= points[0];
  return (
    <svg className="spark" viewBox="0 0 60 20" preserveAspectRatio="none">
      <polyline points={d} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="1.5" />
    </svg>
  );
}

function StockTile({
  game,
  stock,
  history,
  costBasis,
  targetable,
  onPick,
}: {
  game: GameState;
  stock: Stock;
  history: number[];
  costBasis: CostBasis;
  targetable: boolean;
  onPick: () => void;
}) {
  const me = game.players[0];
  const bot = game.players[1];
  const myShares = me.holdings[stock.id] ?? 0;
  const botShares = bot.holdings[stock.id] ?? 0;
  const roundBase = history.length > 0 ? history[history.length - 1] : stock.basePrice;
  const roundChange = stock.price / roundBase - 1;
  const totalChange = stock.price / stock.basePrice - 1;
  const myValue = myShares * stock.price;
  const basis = costBasis[stock.id];
  const positionProfit = basis && basis.shares > 0 ? stock.price / (basis.invested / basis.shares) - 1 : 0;
  const hasStop = me.stopLosses.includes(stock.id);
  const myShort = me.shorts.some((s) => s.stockId === stock.id);
  const flash = usePriceFlash(stock.price);
  return (
    <button
      className={`stock-tile ${targetable ? 'targetable' : ''} ${flash}`}
      data-stock-id={stock.id}
      onClick={onPick}
      disabled={!targetable}
    >
      <div className="stock-head">
        <span className="stock-name">{stock.name}</span>
        <span className="stock-sector">{stock.sector}</span>
      </div>
      <div className="stock-price-row">
        <span className="stock-price" data-testid="price">{won(stock.price)}</span>
        <span data-testid="round-change" className={`stock-change ${roundChange >= 0 ? 'up' : 'down'}`}>
          {pct(roundChange, 1)}
        </span>
      </div>
      <div className="stock-total-change" data-testid="total-change">
        누적 {pct(totalChange, 1)}
      </div>
      <Sparkline points={history} />
      <div className="position-summary">
        {myValue > 0 && (
          <>
            <span data-testid="position-value">평가 {manwon(myValue)}</span>
            <span data-testid="position-profit" className={`position-profit ${positionProfit >= 0 ? 'up' : 'down'}`}>
              {pct(positionProfit, 1)}
            </span>
          </>
        )}
      </div>
      <div className="stock-badges">
        {myValue > 0 && <span className="badge mine">나 {manwon(myValue)}</span>}
        {myShort && <span className="badge short">숏</span>}
        {hasStop && <span className="badge stop">손절예약</span>}
        {botShares > 0 && <span className="badge theirs">AI {manwon(botShares * stock.price)}</span>}
      </div>
    </button>
  );
}

function EnergyPips({ energy, cap }: { energy: number; cap: number }) {
  return (
    <div className="energy" title={`에너지 ${energy}/${cap}`}>
      <Zap size={14} />
      {Array.from({ length: cap }, (_, i) => (
        <span key={i} className={`pip ${i < energy ? 'on' : ''}`} />
      ))}
    </div>
  );
}

function AssetBar({ game }: { game: GameState }) {
  const cfg = game.config;
  const me = game.players[0];
  const total = assets(game, me);
  const lo = cfg.bankruptThreshold;
  const hi = cfg.targetAssets;
  const ratio = Math.min(1, Math.max(0, (total - lo) / (hi - lo)));
  const startRatio = (cfg.startCash - lo) / (hi - lo);
  const danger = total < cfg.startCash * 0.7;
  return (
    <div className="asset-bar-wrap">
      <div className="asset-labels">
        <span className="asset-total">
          내 자산 <b className={danger ? 'down' : ''}>{manwon(total)}</b>
        </span>
        <span className="asset-cash">
          <Coins size={12} /> 현금 {manwon(me.cash)} · 주식 {manwon(holdingsValue(game, me))}
        </span>
      </div>
      <div className="asset-values">
        <span className="asset-value" data-testid="my-cash">
          <Coins size={14} />
          <span>현금</span>
          <b>{manwon(me.cash)}</b>
        </span>
        <span className="asset-value" data-testid="my-stock-value">
          <span className="asset-value-icon">주식</span>
          <span>평가액</span>
          <b>{manwon(holdingsValue(game, me))}</b>
        </span>
      </div>
      <div className="asset-bar">
        <div className="asset-fill" style={{ width: `${ratio * 100}%` }} />
        <span className="tick start" style={{ left: `${startRatio * 100}%` }} />
      </div>
      <div className="asset-goal-row">
        <span className="goal-lo">
          <AlertTriangle size={11} /> 마진콜 {manwon(lo)}
        </span>
        <span className="goal-hi">
          <Flag size={11} /> 목표 {manwon(hi)}
        </span>
      </div>
    </div>
  );
}

function ReportOverlay({
  report,
  game,
  onNext,
  gameOver,
}: {
  report: RoundReport;
  game: GameState;
  onNext: () => void;
  gameOver: boolean;
}) {
  const feedback = useMemo(() => describeEvents(report.events, game, 0), [report.events, game]);
  return (
    <div className="overlay">
      <div className="panel">
        <h2>{report.round}라운드 정산</h2>
        {report.eventFired && (
          <p className="report-event">
            <Newspaper size={14} /> {report.eventFired}
          </p>
        )}
        {report.botPlays.length > 0 && (
          <p className="report-bot">
            <BotIcon size={14} /> AI: {report.botPlays.join(', ')}
          </p>
        )}
        {feedback.length > 0 && (
          <div className="feedback-list" data-testid="feedback-list">
            {feedback.map((line, i) => (
              <p key={i} className={`feedback-line feedback-${line.tone}`} data-testid="feedback-line">
                {line.text}
              </p>
            ))}
          </div>
        )}
        <div className="report-stocks">
          {report.moves.map((m) => {
            const ch = m.after / m.before - 1;
            return (
              <div key={m.id} className="report-stock-row">
                <span>{m.name}</span>
                <span className={ch >= 0 ? 'up' : 'down'}>{pct(ch)}</span>
                <span className="report-price">{won(m.after)}</span>
              </div>
            );
          })}
        </div>
        <div className="report-assets">
          <div>
            <span>내 자산</span>
            <b>{manwon(report.me.after)}</b>
            <em className={report.me.after >= report.me.before ? 'up' : 'down'}>
              {signedManwon(report.me.after - report.me.before)}
            </em>
          </div>
          <div>
            <span>AI 자산</span>
            <b>{manwon(report.bot.after)}</b>
            <em className={report.bot.after >= report.bot.before ? 'up' : 'down'}>
              {signedManwon(report.bot.after - report.bot.before)}
            </em>
          </div>
        </div>
        <button className="primary" onClick={onNext}>
          {gameOver ? '결과 보기' : '다음 라운드'} <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

function GameOver({
  game,
  settlement,
  difficultyLabel,
  onRestart,
}: {
  game: GameState;
  settlement: MatchSettlement | null;
  difficultyLabel: string;
  onRestart: () => void;
}) {
  const me = assets(game, game.players[0]);
  const bot = assets(game, game.players[1]);
  const iWon = game.winner === 0;
  const reasonText =
    game.winReason === 'bankrupt'
      ? iWon
        ? 'AI가 마진콜로 퇴출됐다!'
        : '내 자산이 반토막… 마진콜!'
      : game.winReason === 'target'
        ? iWon
          ? `목표 ${manwon(game.config.targetAssets)} 선점!`
          : `AI가 목표 ${manwon(game.config.targetAssets)}에 먼저 도달했다`
        : '15라운드 종료, 자산 비교';
  const rank = settlement ? rankForGold(settlement.progress.totalGold) : null;
  return (
    <div className="overlay">
      <div className="panel gameover">
        <h1 className={iWon ? 'win' : game.winner === 'draw' ? '' : 'lose'}>
          {game.winner === 'draw' ? '무승부' : iWon ? '승리!' : '패배'}
        </h1>
        <p className="reason">{reasonText}</p>
        {settlement && (
          <>
            <div className="star-row" data-testid="star-rating">
              {[1, 2, 3].map((n) => (
                <Star key={n} size={26} className={n <= settlement.stars ? 'star-on' : 'star-off'} />
              ))}
              <span className="return-ratio">수익률 {pct(settlement.returnRatio, 1)}</span>
            </div>
            <div className="gold-row">
              <span className="gold-earned" data-testid="gold-earned">
                <Coins size={16} /> +{settlement.goldEarned} 골드
              </span>
              <span className="gold-total" data-testid="gold-total">
                누적 {settlement.progress.totalGold} 골드
              </span>
            </div>
            {rank && (
              <div className="rank-row" data-testid="rank-row">
                <span className="rank-name">{rank.name}</span>
                <span className="rank-next">
                  {rank.nextThreshold !== null
                    ? `다음 등급까지 ${rank.nextThreshold - settlement.progress.totalGold} 골드`
                    : '최고 등급 달성'}
                </span>
              </div>
            )}
            {settlement.newlyLearned.length > 0 && (
              <div className="learned-cards" data-testid="learned-cards">
                <span className="learned-label">새로 배운 카드</span>
                <div className="learned-list">
                  {settlement.newlyLearned.map((c) => (
                    <span key={c} className="learned-chip">
                      {CARDS[c].name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="report-assets">
          <div>
            <span>나</span>
            <b>{manwon(me)}</b>
          </div>
          <div>
            <span>AI ({difficultyLabel})</span>
            <b>{manwon(bot)}</b>
          </div>
        </div>
        <button className="primary" onClick={onRestart}>
          <RotateCcw size={16} /> 한 판 더
        </button>
      </div>
    </div>
  );
}

const DIFFICULTY_DESC: Record<DifficultyTier, string> = {
  easy: '현금만 들고 버티는 상대. 기본기를 익히기 좋아.',
  normal: '저가 매수·손절·섹터 이벤트를 골고루 쓰는 상대.',
  hard: '공매도와 쇼크 콤보로 허점을 노리는 공격적인 상대.',
};

function DifficultyScreen({ onSelect }: { onSelect: (tier: DifficultyTier) => void }) {
  return (
    <div className="difficulty-screen" data-testid="difficulty-screen">
      <div className="difficulty-header">
        <Swords size={28} />
        <h2>상대 난이도</h2>
        <p>어떤 AI와 겨룰지 골라줘.</p>
      </div>
      <div className="difficulty-list">
        {DIFFICULTY_TIERS.map((d) => (
          <button
            key={d.tier}
            data-testid="difficulty-option"
            data-tier={d.tier}
            className={`difficulty-card difficulty-${d.tier}`}
            onClick={() => onSelect(d.tier)}
          >
            <span className="difficulty-label">{d.label}</span>
            <span className="difficulty-desc">{DIFFICULTY_DESC[d.tier]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MulliganScreen({
  hand,
  cfg,
  onConfirm,
}: {
  hand: CardId[];
  cfg: GameState['config'];
  onConfirm: (discardIndices: number[]) => void;
}) {
  const [marked, setMarked] = useState<Set<number>>(new Set());

  function toggle(idx: number) {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="mulligan-screen" data-testid="mulligan-screen">
      <div className="mulligan-header">
        <h2>시작 손패</h2>
        <p>
          마음에 안 드는 카드를 눌러 표시하면 <b>{marked.size}장</b>을 새 카드로 바꿔줘. 이 기회는 한
          판에 한 번뿐이야.
        </p>
      </div>
      <div className="mulligan-hand">
        {hand.map((c, i) => {
          const def = CARDS[c];
          const isMarked = marked.has(i);
          return (
            <button
              key={`${c}-${i}`}
              data-testid="mulligan-card"
              className={`card ${KIND_CLASS[def.kind]} ${isMarked ? 'marked-discard' : ''}`}
              onClick={() => toggle(i)}
              title={CARD_TOOLTIP[c]}
            >
              <span className="card-cost">{def.cost}</span>
              <span className="card-name">{def.name}</span>
              <span className="card-effect">{cardEffectText(c, cfg)}</span>
              <span className="card-kind">{KIND_LABEL[def.kind]}</span>
              {isMarked && <span className="discard-mark">교체</span>}
            </button>
          );
        })}
      </div>
      <button className="primary mulligan-confirm" onClick={() => onConfirm([...marked])}>
        {marked.size > 0 ? `${marked.size}장 교체하고 시작` : '이대로 시작'} <ChevronsRight size={16} />
      </button>
    </div>
  );
}

export function App() {
  const {
    game,
    history,
    costBasis,
    phase,
    difficulty,
    report,
    botFeed,
    legal,
    settlement,
    confirmMulligan,
    selectDifficulty,
    playerPlay,
    endPlayerTurn,
    nextRound,
    restart,
  } = useMatch();
  const [selected, setSelected] = useState<CardId | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const toastSeq = useRef(0);
  const me = game.players[0];
  const bot = game.players[1];
  const cfg = game.config;
  const difficultyLabel = DIFFICULTY_TIERS.find((d) => d.tier === difficulty)?.label ?? difficulty;
  window.__match = { game, history, costBasis, report, settlement, difficulty };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1100);
    return () => clearTimeout(t);
  }, [toast]);

  function announce(card: CardId, targetId?: string) {
    const name = CARDS[card].name;
    const suffix = targetId ? ` → ${game.stocks.find((s) => s.id === targetId)?.name ?? ''}` : '';
    setToast({ text: `${name}${suffix}`, id: ++toastSeq.current });
  }

  const playableCards = useMemo(() => new Set(legal.map((p) => p.card)), [legal]);
  const targets = useMemo(
    () => new Set(legal.filter((p) => p.card === selected && p.target).map((p) => p.target!)),
    [legal, selected],
  );

  function onCardTap(card: CardId, idx: number) {
    if (phase !== 'player' || !playableCards.has(card)) return;
    void idx;
    const def = CARDS[card];
    if (!def.needsTarget) {
      setSelected(null);
      playerPlay(card);
      announce(card);
      return;
    }
    setSelected((cur) => (cur === card ? null : card));
  }

  function onStockPick(stockId: string) {
    if (!selected) return;
    playerPlay(selected, stockId);
    announce(selected, stockId);
    setSelected(null);
  }

  const eventIn = game.nextEventRound - game.round;
  const suspicion = me.suspicion;

  if (phase === 'difficulty') {
    return (
      <div className="app">
        <DifficultyScreen onSelect={selectDifficulty} />
      </div>
    );
  }

  if (phase === 'mulligan') {
    return (
      <div className="app">
        <MulliganScreen hand={me.hand} cfg={cfg} onConfirm={confirmMulligan} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="round">
          {game.round}/{cfg.maxRounds}R
        </span>
        <div className="asset-compare">
          <div className="top-asset my">
            <span className="top-asset-label">내 자산</span>
            <strong data-testid="my-assets">{manwon(assets(game, me))}</strong>
            <em
              data-testid="my-assets-delta"
              className={assets(game, me) - cfg.startCash >= 0 ? 'up' : 'down'}
            >
              {signedManwon(assets(game, me) - cfg.startCash)}
            </em>
          </div>
          <div className="top-asset ai">
            <span className="top-asset-label">AI 자산</span>
            <strong data-testid="ai-assets">{manwon(assets(game, bot))}</strong>
            <em
              data-testid="ai-assets-delta"
              className={assets(game, bot) - cfg.startCash >= 0 ? 'up' : 'down'}
            >
              {signedManwon(assets(game, bot) - cfg.startCash)}
            </em>
            {bot.suspicion > 0 && <small className="susp">의혹 {bot.suspicion}</small>}
          </div>
        </div>
        <span className="opp">
          <BotIcon size={14} /> AI 자산 {manwon(assets(game, bot))}
          {bot.suspicion > 0 && <em className="susp">의혹 {bot.suspicion}</em>}
        </span>
        <button className="icon-btn" onClick={restart} title="새 게임">
          <RotateCcw size={15} />
        </button>
      </header>

      <section className="news" title="다음 이벤트 예고 — 미리 포지션을 정리하자">
        <Newspaper size={15} />
        <div className="news-body">
          <span className="news-when">
            {eventIn <= 0 ? '이번 정산에 발동' : `${eventIn}라운드 뒤`}
          </span>
          <span className="news-headline">{game.upcomingEvent.headline}</span>
        </div>
      </section>

      <section className="market">
        {game.stocks.map((s) => (
          <StockTile
            key={s.id}
            game={game}
            stock={s}
            history={history[s.id]}
            costBasis={costBasis}
            targetable={targets.has(s.id)}
            onPick={() => onStockPick(s.id)}
          />
        ))}
      </section>

      {selected && (
        <div className="target-hint">
          <Eye size={14} /> {CARDS[selected].name} — 종목을 선택하세요
          <button onClick={() => setSelected(null)}>취소</button>
        </div>
      )}

      {phase === 'bot' && (
        <div className="bot-feed">
          <BotIcon size={14} />
          <span>{botFeed.length > 0 ? botFeed[botFeed.length - 1] : 'AI가 고민 중…'}</span>
        </div>
      )}

      {toast && (
        <div key={toast.id} className="play-toast">
          {toast.text}
        </div>
      )}

      <footer className="me">
        <AssetBar game={game} />
        {suspicion > 0 && (
          <p className="susp-warning">
            <AlertTriangle size={12} /> 금감원 조사 위험: 의혹 {suspicion} (정산마다{' '}
            {Math.round(suspicion * cfg.insiderCatchPerSuspicion * 100)}% 적발)
          </p>
        )}
        <div className="hand">
          {me.hand.map((c, i) => {
            const def = CARDS[c];
            const playable = phase === 'player' && playableCards.has(c);
            return (
              <button
                key={`${c}-${i}`}
                className={`card ${KIND_CLASS[def.kind]} ${playable ? '' : 'dead'} ${selected === c ? 'selected' : ''}`}
                onClick={() => onCardTap(c, i)}
                title={CARD_TOOLTIP[c]}
              >
                <span className="card-cost">{def.cost}</span>
                <span className="card-name">{def.name}</span>
                <span className="card-effect">{cardEffectText(c, cfg)}</span>
                <span className="card-kind">{KIND_LABEL[def.kind]}</span>
              </button>
            );
          })}
          {me.hand.length === 0 && <p className="empty-hand">손패 없음</p>}
        </div>
        <div className="turn-row">
          <EnergyPips energy={me.energy} cap={cfg.energyCap} />
          <button
            className="primary end-turn"
            disabled={phase !== 'player'}
            onClick={() => {
              setSelected(null);
              void endPlayerTurn();
            }}
          >
            턴 종료 <ChevronsRight size={16} />
          </button>
        </div>
      </footer>

      {phase === 'report' && report && (
        <ReportOverlay report={report} game={game} onNext={nextRound} gameOver={game.winner !== null} />
      )}
      {phase === 'over' && (
        <GameOver game={game} settlement={settlement} difficultyLabel={difficultyLabel} onRestart={restart} />
      )}
    </div>
  );
}
