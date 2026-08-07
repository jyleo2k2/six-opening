'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EMOTES, EMOTE_LABEL, RULES, SECTOR_LABEL, type Emote, type GameView } from 'game';
import { COMPANIES, getEvent } from 'game/data';
import { won } from '@/lib/format';
import { useGameRoom, type FeedLine, type LobbyInfo } from './useGameRoom';

/**
 * 대전 화면 — 서버가 보낸 내 뷰(GameView)를 그대로 그린다.
 * 이벤트 큐·타인 뉴스·타인 보유는 애초에 수신되지 않는다 (기획서 §9).
 */
const EMOTE_ICON: Record<Emote, string> = {
  laugh: '😆',
  cry: '😭',
  despair: '😩',
  thumbsup: '👍',
  yar: '🤩',
};

const pct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
const pctClass = (v: number) => (v > 0 ? 'text-red-500' : v < 0 ? 'text-blue-500' : 'text-neutral-400');

export function GameScreen({ roomId }: { roomId: string }) {
  const [nickname, setNickname] = useState('');
  useEffect(() => {
    const saved = sessionStorage.getItem('kk-nickname');
    setNickname(saved?.trim() || `주주${Math.floor(Math.random() * 90) + 10}`);
  }, []);

  const room = useGameRoom(roomId, nickname);

  // 방 생성 직후 주소를 실제 방 코드로 바꿔 초대가 가능하게 한다 (리마운트 없이)
  useEffect(() => {
    if (roomId === 'new' && room.realRoomId) {
      window.history.replaceState(null, '', `/game/${room.realRoomId}`);
    }
  }, [roomId, room.realRoomId]);

  // 거부 사유 토스트 자동 소거
  useEffect(() => {
    if (!room.rejected) return;
    const timer = setTimeout(room.clearRejected, 2500);
    return () => clearTimeout(timer);
  }, [room.rejected, room.clearRejected]);

  if (room.error) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <p className="font-semibold">방에 들어갈 수 없어요</p>
        <p className="text-sm text-neutral-500">{room.error}</p>
        <p className="text-xs text-neutral-400">
          게임 서버가 켜져 있는지 확인하세요: <code>npm run server</code>
        </p>
        <Link href="/game" className="rounded-xl bg-neutral-900 py-3 text-center font-semibold text-white">
          로비로 돌아가기
        </Link>
      </div>
    );
  }

  if (!room.view) {
    return room.lobby ? (
      <WaitingRoom
        lobby={room.lobby}
        sessionId={room.sessionId}
        roomCode={room.realRoomId}
        onStart={room.start}
      />
    ) : (
      <p className="p-6 text-sm text-neutral-500">서버에 접속하는 중…</p>
    );
  }

  return <Table room={room} />;
}

// ── 대기실 ────────────────────────────────────────────────────────────
function WaitingRoom({
  lobby,
  sessionId,
  roomCode,
  onStart,
}: {
  lobby: LobbyInfo;
  sessionId: string;
  roomCode: string;
  onStart: () => void;
}) {
  const isHost = lobby.hostId === sessionId;
  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">대기실</h1>
        <p className="mt-1 text-sm text-neutral-500">
          친구에게 초대코드를 알려주세요. {lobby.min}~{lobby.max}명이 함께해요.
        </p>
      </header>

      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(roomCode)}
        className="rounded-xl border border-dashed border-neutral-300 py-4 text-center"
      >
        <span className="block text-xs text-neutral-500">초대코드 (누르면 복사)</span>
        <span className="block font-mono text-lg font-bold tracking-widest">{roomCode}</span>
      </button>

      <section className="flex flex-col gap-1.5">
        {lobby.players.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
            <span className="font-medium">
              {p.nickname ?? `플레이어${i + 1}`}
              {p.id === sessionId && <span className="ml-1 text-xs text-neutral-400">(나)</span>}
            </span>
            {p.id === lobby.hostId && <span className="text-xs text-amber-600">방장</span>}
          </div>
        ))}
      </section>

      {isHost ? (
        <button
          type="button"
          onClick={onStart}
          disabled={lobby.players.length < lobby.min}
          className="rounded-xl bg-neutral-900 py-4 font-semibold text-white disabled:opacity-40"
        >
          {lobby.players.length < lobby.min ? `${lobby.min}명부터 시작할 수 있어요` : '게임 시작'}
        </button>
      ) : (
        <p className="text-center text-sm text-neutral-500">방장이 시작하길 기다리는 중…</p>
      )}
    </div>
  );
}

// ── 본 게임 ──────────────────────────────────────────────────────────
function Table({ room }: { room: ReturnType<typeof useGameRoom> }) {
  const view = room.view!;
  const [readySent, setReadySent] = useState(false);
  useEffect(() => setReadySent(false), [view.phase, view.turn]);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    map.set(view.me.id, view.me.nickname);
    for (const other of view.others) map.set(other.id, other.nickname);
    return map;
  }, [view]);

  const lastEvent = view.eventLog.at(-1);
  const myNews = view.me.news.filter((n) => n.turn === view.turn);
  const myForecast = view.me.forecasts.find((f) => f.turn === view.turn);

  if (view.phase === 'ended') return <EndScreen view={view} />;

  const sendReady = () => {
    room.ready();
    setReadySent(true);
  };

  return (
    <div className="relative flex flex-col gap-3 p-3 pb-24">
      {/* 헤더 — 턴·페이즈·타이머 */}
      <header className="flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-3 text-white">
        <div>
          <p className="text-xs text-neutral-400">
            {view.turn}년차 / {RULES.turns}년 · {view.poolId}
          </p>
          <p className="font-semibold">
            {view.phase === 'prep' ? '📰 준비 — 사고팔 시간' : view.phase === 'chat' ? '💬 작전 채팅' : '⚡ 사건 발생'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{room.secondsLeft ?? '—'}</p>
          <p className="text-[10px] text-neutral-400">남은 초</p>
        </div>
      </header>

      {/* 순위 스트립 — 총자산만 공개된다 */}
      <section className="flex gap-1.5 overflow-x-auto">
        {view.standings.map((s) => (
          <div
            key={s.playerId}
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs ${
              s.playerId === view.me.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200'
            }`}
          >
            <span className="font-semibold">{s.rank}위 {names.get(s.playerId) ?? '?'}</span>
            <span className={s.playerId === view.me.id ? 'ml-1.5 text-neutral-300' : 'ml-1.5 text-neutral-500'}>
              {won(s.totalAsset)}
            </span>
          </div>
        ))}
      </section>

      {view.phase === 'prep' && (
        <>
          <NewsAndInfo
            news={myNews}
            forecast={myForecast}
            cash={view.me.cash}
            infoBought={view.me.infoBoughtThisTurn}
            purchases={view.purchases.filter((p) => p.turn === view.turn)}
            names={names}
            meId={view.me.id}
            onBuyInfo={room.buyInfo}
          />
          <PriceBoard view={view} lastChanges={lastEvent?.changes ?? {}} onBuy={room.buy} onSell={room.sell} />
        </>
      )}

      {view.phase === 'chat' && <ChatPanel feed={room.feed} names={names} meId={view.me.id} onChat={room.chat} />}

      {/* 준비 완료 + 이모티콘 — 이모티콘은 모든 페이즈 상시 (기획서 §4) */}
      <div className="fixed inset-x-0 bottom-14 z-10 mx-auto flex max-w-md items-center gap-1.5 px-3">
        {EMOTES.map((kind) => (
          <button
            key={kind}
            type="button"
            title={EMOTE_LABEL[kind]}
            onClick={() => room.emote(kind)}
            className="h-10 w-10 rounded-full border border-neutral-200 bg-white text-lg shadow-sm active:scale-90"
          >
            {EMOTE_ICON[kind]}
          </button>
        ))}
        {(view.phase === 'prep' || view.phase === 'chat') && (
          <button
            type="button"
            onClick={sendReady}
            disabled={readySent}
            className="ml-auto h-10 rounded-full bg-neutral-900 px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-40"
          >
            {readySent ? '기다리는 중…' : '준비 완료'}
          </button>
        )}
      </div>

      {/* 최근 이모티콘 피드 */}
      <EmoteTicker feed={room.feed} names={names} />

      {view.phase === 'event' && lastEvent && (
        <EventOverlay view={view} eventId={lastEvent.eventId} changes={lastEvent.changes} names={names} onNext={sendReady} readySent={readySent} />
      )}

      {room.rejected && (
        <p className="fixed inset-x-0 bottom-28 z-20 mx-auto w-fit rounded-full bg-neutral-900/90 px-4 py-2 text-xs text-white">
          {room.rejected}
        </p>
      )}
    </div>
  );
}

// ── 뉴스 + 정보소 ─────────────────────────────────────────────────────
function NewsAndInfo({
  news,
  forecast,
  cash,
  infoBought,
  purchases,
  names,
  meId,
  onBuyInfo,
}: {
  news: GameView['me']['news'];
  forecast: GameView['me']['forecasts'][number] | undefined;
  cash: number;
  infoBought: boolean;
  purchases: GameView['purchases'];
  names: Map<string, string>;
  meId: string;
  onBuyInfo: (tier: 1 | 2 | 3) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      {news.map((n) => (
        <div key={n.newsId} className="rounded-xl bg-amber-50 p-3">
          <p className="text-[10px] font-semibold text-amber-600">나에게만 온 소식</p>
          <p className="mt-0.5 text-sm leading-relaxed">{n.text}</p>
        </div>
      ))}

      <div className="rounded-xl border border-neutral-200 p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">정보소</p>
          <p className="text-xs text-neutral-500">내 현금 {won(cash)}</p>
        </div>
        {forecast ? (
          <div className="mt-2 rounded-lg bg-neutral-900 p-3 text-white">
            <p className="text-[10px] text-neutral-400">{RULES.infoTiers[forecast.tier - 1].label} 예보 — 나만 안다</p>
            <p className="mt-0.5 text-sm font-semibold">「{forecast.eventName}」이 온다는 소식!</p>
            <p className="mt-1 text-xs text-neutral-300">
              {forecast.up && <>오를 곳: {SECTOR_LABEL[forecast.up]} </>}
              {forecast.down && <>· 내릴 곳: {SECTOR_LABEL[forecast.down]}</>}
            </p>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {RULES.infoTiers.map((tier) => (
              <button
                key={tier.tier}
                type="button"
                disabled={infoBought || cash < tier.price}
                onClick={() => onBuyInfo(tier.tier)}
                className="rounded-lg border border-neutral-200 py-2 text-center disabled:opacity-40"
              >
                <span className="block text-xs font-semibold">{tier.label}</span>
                <span className="block text-[10px] text-neutral-500">{won(tier.price)}</span>
              </button>
            ))}
          </div>
        )}
        {purchases.length > 0 && (
          <p className="mt-2 text-[11px] text-neutral-500">
            {purchases
              .map((p) => `${p.playerId === meId ? '나' : (names.get(p.playerId) ?? '?')}: ${RULES.infoTiers[p.tier - 1].label} 구매`)
              .join(' · ')}
          </p>
        )}
      </div>
    </section>
  );
}

// ── 시세판 + 매매 ─────────────────────────────────────────────────────
function PriceBoard({
  view,
  lastChanges,
  onBuy,
  onSell,
}: {
  view: GameView;
  lastChanges: Record<string, { pct: number }>;
  onBuy: (companyId: string, qty: number) => void;
  onSell: (companyId: string, qty: number) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const held = (companyId: string) => view.me.holdings.find((h) => h.companyId === companyId);

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-sm font-semibold text-neutral-500">시세판</h2>
      {COMPANIES.map((company) => {
        const price = view.prices[company.id];
        const change = lastChanges[company.id];
        const holding = held(company.id);
        const open = selected === company.id;
        const maxBuy = Math.floor(view.me.cash / price);

        return (
          <div key={company.id} className="rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setSelected(open ? null : company.id);
                setQty(1);
              }}
              className="flex w-full items-center justify-between p-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold">
                  {company.name}
                  {holding && <span className="ml-1.5 rounded bg-neutral-100 px-1 text-[10px]">{holding.qty}주</span>}
                </p>
                <p className="text-[10px] text-neutral-400">{SECTOR_LABEL[company.sector]}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{won(price)}</p>
                <p className={`text-[10px] ${change ? pctClass(change.pct) : 'text-neutral-300'}`}>
                  {change ? pct(change.pct) : '—'}
                </p>
              </div>
            </button>

            {open && (
              <div className="flex items-center gap-1.5 border-t border-neutral-100 p-2">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-9 w-9 rounded-lg border border-neutral-200">
                  −
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums">{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} className="h-9 w-9 rounded-lg border border-neutral-200">
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onBuy(company.id, qty)}
                  disabled={qty > maxBuy}
                  className="ml-auto h-9 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white disabled:opacity-40"
                >
                  매수 {won(price * qty)}
                </button>
                <button
                  type="button"
                  onClick={() => onSell(company.id, qty)}
                  disabled={!holding || qty > holding.qty}
                  className="h-9 rounded-lg bg-blue-500 px-3 text-xs font-semibold text-white disabled:opacity-40"
                >
                  매도
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ── 채팅 ─────────────────────────────────────────────────────────────
function ChatPanel({
  feed,
  names,
  meId,
  onChat,
}: {
  feed: FeedLine[];
  names: Map<string, string>;
  meId: string;
  onChat: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onChat(text);
    setDraft('');
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-48 flex-col gap-1.5 rounded-xl bg-neutral-50 p-3">
        <p className="text-[10px] text-neutral-400">
          찌라시를 흘려도, 진실을 말해도 됩니다. 믿을지는 각자의 몫.
        </p>
        {feed.filter((line) => line.text).slice(-30).map((line) => (
          <p key={line.id} className="text-sm">
            <span className={`font-semibold ${line.playerId === meId ? 'text-amber-600' : ''}`}>
              {line.playerId === meId ? '나' : (line.nickname ?? names.get(line.playerId) ?? '?')}
            </span>{' '}
            {line.text}
          </p>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          maxLength={RULES.chatMaxLength}
          placeholder="소문, 자랑, 연막…"
          className="h-11 flex-1 rounded-xl border border-neutral-200 px-3 text-sm"
        />
        <button type="button" onClick={submit} className="h-11 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white">
          전송
        </button>
      </div>
    </section>
  );
}

// ── 이모티콘 티커 ─────────────────────────────────────────────────────
function EmoteTicker({ feed, names }: { feed: FeedLine[]; names: Map<string, string> }) {
  const recent = feed.filter((line) => line.emote).slice(-4);
  if (recent.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-10 mx-auto flex w-fit gap-1.5">
      {recent.map((line) => (
        <span key={line.id} className="rounded-full bg-white/95 px-2.5 py-1 text-xs shadow">
          {names.get(line.playerId) ?? '?'} {EMOTE_ICON[line.emote!]}
        </span>
      ))}
    </div>
  );
}

// ── 이벤트 연출 ───────────────────────────────────────────────────────
function EventOverlay({
  view,
  eventId,
  changes,
  names,
  onNext,
  readySent,
}: {
  view: GameView;
  eventId: string;
  changes: Record<string, { before: number; after: number; pct: number }>;
  names: Map<string, string>;
  onNext: () => void;
  readySent: boolean;
}) {
  const event = getEvent(eventId);
  const myHoldings = view.me.holdings;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between overflow-y-auto bg-neutral-950/95 p-5 text-white">
      <div>
        <p className="text-xs text-neutral-400">{event.year} · 실제로 있었던 일</p>
        <h2 className="mt-1 text-2xl font-bold">{event.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">{event.blurb}</p>

        {myHoldings.length > 0 && (
          <div className="mt-4 flex flex-col gap-1">
            <p className="text-xs text-neutral-400">내 주식은…</p>
            {myHoldings.map((h) => {
              const change = changes[h.companyId];
              const company = COMPANIES.find((c) => c.id === h.companyId);
              return (
                <div key={h.companyId} className="flex justify-between rounded-lg bg-white/10 px-3 py-2 text-sm">
                  <span>{company?.name ?? h.companyId} × {h.qty}</span>
                  <span className={change ? pctClass(change.pct) : 'text-neutral-400'}>
                    {change ? pct(change.pct) : '변화 없음'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-1">
          <p className="text-xs text-neutral-400">순위</p>
          {view.standings.map((s) => (
            <div
              key={s.playerId}
              className={`flex justify-between rounded-lg px-3 py-2 text-sm ${
                s.playerId === view.me.id ? 'bg-amber-400 font-semibold text-neutral-900' : 'bg-white/10'
              }`}
            >
              <span>
                {s.rank}위 {s.playerId === view.me.id ? '나' : (names.get(s.playerId) ?? '?')}
              </span>
              <span className="tabular-nums">{won(s.totalAsset)}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={readySent}
        className="mt-5 rounded-xl bg-white py-4 font-semibold text-neutral-900 disabled:opacity-40"
      >
        {readySent ? '다른 친구들을 기다리는 중…' : '다음 ▶'}
      </button>
    </div>
  );
}

// ── 종료 대시보드 ─────────────────────────────────────────────────────
function EndScreen({ view }: { view: GameView }) {
  const names = new Map<string, string>([[view.me.id, view.me.nickname], ...view.others.map((o) => [o.id, o.nickname] as const)]);
  const winner = view.standings[0];

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="rounded-2xl bg-neutral-900 p-5 text-center text-white">
        <p className="text-xs text-neutral-400">{RULES.turns}년의 결과</p>
        <p className="mt-1 text-2xl font-bold">🏆 {names.get(winner.playerId) ?? '?'}</p>
        <p className="mt-1 text-sm text-neutral-300">{won(winner.totalAsset)}</p>
      </header>

      <section className="flex flex-col gap-1.5">
        {view.standings.map((s) => (
          <div
            key={s.playerId}
            className={`flex items-center justify-between rounded-xl border p-4 ${
              s.playerId === view.me.id ? 'border-neutral-900' : 'border-neutral-200'
            }`}
          >
            <span className="font-semibold">
              {s.rank}위 {s.playerId === view.me.id ? '나' : (names.get(s.playerId) ?? '?')}
            </span>
            <span className="tabular-nums text-sm">{won(s.totalAsset)}</span>
          </div>
        ))}
      </section>

      <p className="text-center text-[11px] text-neutral-400">명예의 전당 기록은 준비 중이에요 (T6)</p>

      <Link href="/game" className="rounded-xl bg-neutral-900 py-4 text-center font-semibold text-white">
        로비로
      </Link>
    </div>
  );
}
