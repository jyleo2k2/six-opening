"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReasonForm } from "@/features/f3-reason";
import { stockBySymbol } from "@/shared/data/stocks";
import { useLiveQuotes } from "@/shared/data/use-live-quotes";
import { buildTradeMarkers, chartBounds, symbolTrades } from "@/shared/engine/trade-markers";
import { useFamilyFeedStore } from "@/shared/store/use-family-feed-store";
import { useInvestmentStore } from "@/shared/store/use-investment-store";
import type { FamilyMember, ReasonRecord, Trade, TradeSide } from "@/shared/types";
import { Button, Card, ConfettiBurst, LoadingScreen, PhoneShell, PriceText, ScreenHeader } from "@/shared/ui";

type Step = "detail" | "quantity" | "reason" | "complete";
type ChartPeriod = "minute" | "daily" | "weekly";

const chartPeriods: { value: ChartPeriod; label: string }[] = [
  { value: "minute", label: "분 차트" },
  { value: "daily", label: "일 차트" },
  { value: "weekly", label: "주 차트" },
];

const clientChartCache = new Map<string, number[]>();

function fixtureChart(values: number[], period: ChartPeriod) {
  if (period === "minute") return values.slice(-6);
  if (period === "weekly") return values.filter((_, index) => index % 2 === 0 || index === values.length - 1);
  return values;
}

/** 가족 매매 지점 마커. 좌표·라벨 계산은 shared/engine/trade-markers가 소유한다. */
const MEMBER_MARKER: Record<FamilyMember, string> = {
  child: "fill-magenta",
  parent: "fill-navy",
};

function LineChart({ values, positive, trades, viewer, onSelectTrade }: {
  values: number[];
  positive: boolean;
  trades: Trade[];
  viewer: FamilyMember;
  onSelectTrade: (trade: Trade) => void;
}) {
  const width = 330;
  const height = 150;
  const { min, range } = chartBounds(values, trades);
  const points = values.map((value, index) => `${index / (values.length - 1) * width},${height - (value - min) / range * (height - 18) - 9}`).join(" ");
  const markers = buildTradeMarkers({ trades, viewer, min, range, width, height });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="최근 가격 흐름과 가족 매매 지점 차트">
      <line x1="0" y1="35" x2={width} y2="35" className="stroke-gray" strokeDasharray="4 4"/>
      <line x1="0" y1="80" x2={width} y2="80" className="stroke-gray" strokeDasharray="4 4"/>
      <line x1="0" y1="125" x2={width} y2="125" className="stroke-gray" strokeDasharray="4 4"/>
      <polyline points={points} fill="none" className={positive ? "stroke-up" : "stroke-down"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      {markers.map((marker) => (
        <g key={marker.id} className="cursor-pointer" onClick={() => onSelectTrade(trades.find((trade) => trade.id === marker.id)!)} role="button" aria-label={marker.label}>
          <title>{marker.label}</title>
          <polygon points={marker.points} className={MEMBER_MARKER[marker.member]} stroke="white" strokeWidth="1.5"/>
        </g>
      ))}
    </svg>
  );
}

export function StockDetailScreen({ symbol }: { symbol: string }) {
  const router = useRouter();
  const stock = stockBySymbol.get(symbol);
  const { quotes, loading: quoteLoading, loadedCount, totalCount } = useLiveQuotes([symbol]);
  const liveQuote = quotes[symbol];
  const quote = liveQuote ?? (stock ? { symbol, name: stock.name, price: stock.price, change: stock.change, rate: stock.rate, updatedAt: new Date().toISOString(), source: "fixture" as const } : undefined);
  const cash = useInvestmentStore((state) => state.cash);
  const holdings = useInvestmentStore((state) => state.holdings);
  const executeTrade = useInvestmentStore((state) => state.executeTrade);
  const recordDetailEvent = useInvestmentStore((state) => state.recordDetailEvent);
  const ownTrades = useInvestmentStore((state) => state.trades);
  const viewer = useFamilyFeedStore((state) => state.viewer);
  const familyTrades = useFamilyFeedStore((state) => state.familyTrades);
  // 이 종목의 가족 전원 체결 지점. 미체결 주문은 넣지 않는다 (실시간 따라하기 방지).
  const chartTrades = symbolTrades([...ownTrades, ...familyTrades], symbol);
  const holding = holdings.find((item) => item.symbol === symbol);
  const [step, setStep] = useState<Step>("detail");
  const [side, setSide] = useState<TradeSide>("buy");
  const [quantity, setQuantity] = useState(1);
  const [completedRecord, setCompletedRecord] = useState<ReasonRecord>();
  const [chart, setChart] = useState<number[]>(stock?.chart ?? []);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");

  useEffect(() => {
    if (!stock) return;
    recordDetailEvent(symbol, "view");
    const startedAt = Date.now();
    return () => { if (Date.now() - startedAt >= 1000) recordDetailEvent(symbol, "tab"); };
  }, [recordDetailEvent, stock, symbol]);

  useEffect(() => {
    if (!stock) return;
    let cancelled = false;
    const cacheKey = `${symbol}:${chartPeriod}`;
    setChart(clientChartCache.get(cacheKey) ?? fixtureChart(stock.chart, chartPeriod));
    fetch(`/api/quote/${symbol}/chart?period=${chartPeriod}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled && Array.isArray(data?.points) && data.points.length) {
          const values = data.points.map((point: { price: number }) => point.price);
          clientChartCache.set(cacheKey, values);
          setChart(values);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [chartPeriod, stock, symbol]);

  const currentPrice = quote?.price ?? 0;
  const maxQuantity = side === "buy" ? Math.floor(cash / currentPrice) : holding?.quantity ?? 0;
  const total = currentPrice * quantity;
  const holdingValue = (holding?.quantity ?? 0) * currentPrice;
  const holdingProfit = holding ? (currentPrice - holding.averagePrice) * holding.quantity : 0;
  const holdingRate = holding ? (currentPrice - holding.averagePrice) / holding.averagePrice * 100 : 0;

  if (!stock || !quote) return <PhoneShell><ScreenHeader title="기업 정보" onBack={() => router.back()} /><p className="p-8 text-center">등록되지 않은 기업이야.</p></PhoneShell>;
  if (quoteLoading) return <PhoneShell><LoadingScreen loaded={loadedCount} total={totalCount} message={`${stock.name} 시세를 확인하고 있어`} /></PhoneShell>;

  const startOrder = (nextSide: TradeSide) => {
    setSide(nextSide);
    setQuantity(1);
    setStep("quantity");
  };
  const goBack = () => {
    if (step === "detail") router.back();
    else if (step === "quantity") setStep("detail");
    else if (step === "reason") setStep("quantity");
  };
  const complete = (record: ReasonRecord) => {
    executeTrade(symbol, side, quantity, currentPrice, record);
    setCompletedRecord(record);
    setStep("complete");
  };

  if (step === "complete" && completedRecord) return (
    <PhoneShell>
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 text-center">
        <ConfettiBurst />
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-sm font-extrabold text-white">키웅이</span>
        <h1 className="mt-6 text-2xl font-extrabold">기록 완료!</h1>
        <p className="mt-2 text-sm opacity-60">키웅이가 기억해둘게.<br/>나중에 투자 기록에서 다시 만나자</p>
        <Card className="mt-7 w-full text-left">
          <div className="flex items-center justify-between border-b border-gray pb-4"><strong>{stock.name}</strong><strong>{quantity}주 {side === "buy" ? "매수" : "매도"}</strong></div>
          <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="opacity-60">체결 금액</dt><dd className="font-bold tabular-nums">{total.toLocaleString()}원</dd></div><div className="flex justify-between gap-4"><dt className="shrink-0 opacity-60">기록한 이유</dt><dd className="text-right font-bold">{completedRecord.reason}</dd></div></dl>
        </Card>
        <div className="mt-7 grid w-full grid-cols-2 gap-3"><Button variant="secondary" onClick={() => router.push("/stocks")}>종목 더 보기</Button><Button onClick={() => router.push("/")}>포트폴리오</Button></div>
      </div>
    </PhoneShell>
  );

  if (step === "reason") return <PhoneShell><ScreenHeader title={side === "buy" ? "매수" : "매도"} onBack={goBack} /><ReasonForm side={side} onSubmit={complete} /></PhoneShell>;

  if (step === "quantity") return (
    <PhoneShell>
      <ScreenHeader title={side === "buy" ? "매수" : "매도"} onBack={goBack} />
      <section className="flex flex-1 flex-col px-4 py-5">
        <Card className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg text-[11px] font-extrabold text-navy">{stock.logo}</span><div className="flex-1"><strong>{stock.name}</strong><p className="mt-1 text-xs opacity-60">현재가 {currentPrice.toLocaleString()}원</p></div><span className="text-xs"><PriceText rate={quote.rate} compact /></span></Card>
        {side === "sell" && <Card className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs opacity-60">보유 수량</p><strong className="mt-1 block">{holding?.quantity ?? 0}주</strong></div><div><p className="text-xs opacity-60">평가 금액</p><strong className="mt-1 block">{holdingValue.toLocaleString()}원</strong></div><div className="col-span-2"><p className="text-xs opacity-60">평가 손익</p><span className="mt-1 block text-sm"><PriceText value={Math.round(holdingProfit)} rate={holdingRate} /></span></div></Card>}
        <div className="py-8 text-center"><h2 className="text-xl font-extrabold">몇 주 {side === "buy" ? "살까" : "팔까"}?</h2><div className="mt-6 flex items-center justify-center gap-8"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-12 w-12 items-center justify-center rounded-full border border-gray bg-white text-2xl">−</button><strong className="min-w-20 text-3xl tabular-nums">{quantity}주</strong><button onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} className="flex h-12 w-12 items-center justify-center rounded-full border border-gray bg-white text-2xl">＋</button></div><div className="mt-5 flex justify-center gap-2">{side === "buy" ? [1, 5, 10].map((value) => <button key={value} onClick={() => setQuantity(Math.min(maxQuantity, value))} className="rounded-full border border-gray bg-white px-4 py-2 text-xs font-bold">{value}주</button>) : [1, 2].map((value) => <button key={value} onClick={() => setQuantity(Math.min(maxQuantity, value))} className="rounded-full border border-gray bg-white px-4 py-2 text-xs font-bold">{value}주</button>)}<button onClick={() => setQuantity(maxQuantity)} className="rounded-full border border-gray bg-white px-4 py-2 text-xs font-bold">{side === "buy" ? "최대" : "전량"}</button></div></div>
        <Card className="space-y-3 text-sm"><div className="flex justify-between"><span className="opacity-60">예상 {side === "buy" ? "주문" : "매도"}금액</span><strong className="text-lg tabular-nums">{total.toLocaleString()}원</strong></div>{side === "buy" && <div className="flex justify-between"><span className="opacity-60">주문 가능 금액</span><strong className="tabular-nums">{cash.toLocaleString()}원</strong></div>}<p className="border-t border-gray pt-3 text-[11px] opacity-60">모의투자는 표시된 시장가로 즉시 체결돼. 데모 수수료·세금은 0원이야.</p></Card>
        <div className="mt-auto pt-5"><Button disabled={quantity < 1 || quantity > maxQuantity} onClick={() => setStep("reason")}>다음</Button>{maxQuantity < 1 && <p className="mt-2 text-center text-xs text-down">{side === "buy" ? "주문할 수 있는 금액이 부족해." : "매도할 보유 수량이 없어."}</p>}</div>
      </section>
    </PhoneShell>
  );

  return (
    <PhoneShell>
      <ScreenHeader title={stock.name} onBack={() => router.back()} right={<span className="text-2xl">☆</span>} />
      <section className="space-y-4 px-4 py-5">
        <Card>
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg text-[11px] font-extrabold text-navy">{stock.logo}</span><div><p className="text-2xl font-extrabold tabular-nums">{currentPrice.toLocaleString()}원</p><p className="mt-1 text-xs"><PriceText value={quote.change} rate={quote.rate} /> 오늘</p></div></div>
          <LineChart values={chart.length > 1 ? chart : stock.chart} positive={(chart.at(-1) ?? 0) >= (chart[0] ?? 0)} trades={chartTrades} viewer={viewer} onSelectTrade={(trade) => router.push(`/feed?trade=${trade.id}`)} />
          <div className="grid grid-cols-3 gap-2">
            {chartPeriods.map((period) => <button key={period.value} type="button" onClick={() => setChartPeriod(period.value)} className={`rounded-full border px-3 py-2 text-xs font-bold ${chartPeriod === period.value ? "border-magenta bg-magenta text-white" : "border-gray bg-white text-ink"}`}>{period.label}</button>)}
          </div>
          <p className="mt-3 text-right text-[10px] opacity-60">{quote.source === "kiwoom" ? `키움 시세 · ${new Date(quote.updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}` : "데모 시세 · 키움 연결 시 자동 갱신"}</p>
        </Card>
        {holding && <Card className="flex items-center justify-between"><div><p className="text-xs font-bold opacity-60">내가 가진 주식</p><strong className="mt-1 block">{holding.quantity}주 · {holdingValue.toLocaleString()}원</strong></div><div className="text-right"><p className="text-xs font-bold opacity-60">수익률</p><span className="mt-1 block text-sm"><PriceText rate={holdingRate} compact /></span></div></Card>}
        <Card><h2 className="text-base font-extrabold">이 회사는 무슨 일을 해?</h2><p className="mt-2 text-sm leading-6 opacity-70">{stock.description}</p></Card>
        <Card><h2 className="text-base font-extrabold">최근 무슨 일이 있었어?</h2><p className="mt-2 text-sm leading-6 opacity-70">{stock.recent}</p></Card>
      </section>
      <div className="sticky bottom-0 mt-auto grid grid-cols-2 gap-3 bg-white p-4">{holding ? <Button variant="secondary" onClick={() => startOrder("sell")}>매도</Button> : <Button variant="secondary" disabled>보유 없음</Button>}<Button onClick={() => startOrder("buy")}>매수</Button></div>
    </PhoneShell>
  );
}
