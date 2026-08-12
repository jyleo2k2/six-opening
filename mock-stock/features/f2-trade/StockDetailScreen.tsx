"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReasonForm } from "@/features/f3-reason";
import { TradingViewChart, type ChartPoint, type ChartType } from "@/features/f2-trade/TradingViewLineChart";
import { stockBySymbol } from "@/shared/data/stocks";
import { useLiveQuotes } from "@/shared/data/use-live-quotes";
import { symbolTrades } from "@/shared/engine/trade-markers";
import { useFamilyFeedStore } from "@/shared/store/use-family-feed-store";
import { useInvestmentStore } from "@/shared/store/use-investment-store";
import type { ReasonRecord, TradeSide } from "@/shared/types";
import { Button, Card, ConfettiBurst, PhoneShell, PriceText, ScreenHeader } from "@/shared/ui";

type Step = "detail" | "quantity" | "reason" | "complete";
type ChartPeriod = "minute" | "daily" | "weekly";

const chartPeriods: { value: ChartPeriod; label: string }[] = [
  { value: "minute", label: "분 차트" },
  { value: "daily", label: "일 차트" },
  { value: "weekly", label: "주 차트" },
];

const chartTypes: { value: ChartType; label: string }[] = [
  { value: "line", label: "선 차트" },
  { value: "candlestick", label: "캔들 차트" },
];

const clientChartCache = new Map<string, ChartPoint[]>();
const chartPreloadPromises = new Map<string, Promise<ChartPoint[] | undefined>>();

function preloadChart(symbol: string, period: ChartPeriod) {
  const cacheKey = `${symbol}:${period}`;
  const cached = clientChartCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  const pending = chartPreloadPromises.get(cacheKey);
  if (pending) return pending;
  const request = fetch(`/api/quote/${symbol}/chart?period=${period}`, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : null)
    .then((data) => {
      if (!Array.isArray(data?.points)) return undefined;
      const points = data.points.filter((point: ChartPoint) => Number.isFinite(point.time) && Number.isFinite(point.open) && Number.isFinite(point.high) && Number.isFinite(point.low) && Number.isFinite(point.close));
      if (!points.length) return undefined;
      clientChartCache.set(cacheKey, points);
      return points;
    })
    .catch(() => undefined)
    .finally(() => chartPreloadPromises.delete(cacheKey));
  chartPreloadPromises.set(cacheKey, request);
  return request;
}

export function StockDetailScreen({ symbol }: { symbol: string }) {
  const router = useRouter();
  const stock = stockBySymbol.get(symbol);
  const { quotes } = useLiveQuotes([symbol]);
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
  const [charts, setCharts] = useState<Record<ChartPeriod, ChartPoint[]>>(() => ({
    minute: [],
    daily: [],
    weekly: [],
  }));
  const [chartErrors, setChartErrors] = useState<Record<ChartPeriod, boolean>>({ minute: false, daily: false, weekly: false });
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const [chartType, setChartType] = useState<ChartType>("line");

  useEffect(() => {
    if (!stock) return;
    recordDetailEvent(symbol, "view");
    const startedAt = Date.now();
    return () => { if (Date.now() - startedAt >= 1000) recordDetailEvent(symbol, "tab"); };
  }, [recordDetailEvent, stock, symbol]);

  useEffect(() => {
    if (!stock) return;
    let cancelled = false;
    const immediate = Object.fromEntries(chartPeriods.map(({ value }) => [value, clientChartCache.get(`${symbol}:${value}`) ?? []])) as Record<ChartPeriod, ChartPoint[]>;
    setCharts(immediate);
    setChartErrors({ minute: false, daily: false, weekly: false });
    for (const { value: period } of chartPeriods) {
      preloadChart(symbol, period).then((points) => {
        if (cancelled) return;
        if (points) setCharts((current) => ({ ...current, [period]: points }));
        else setChartErrors((current) => ({ ...current, [period]: true }));
      });
    }
    return () => { cancelled = true; };
  }, [stock, symbol]);

  const currentPrice = quote?.price ?? 0;
  const chart = charts[chartPeriod];
  const chartValues = chart.map((point) => point.close);
  const maxQuantity = side === "buy" ? Math.floor(cash / currentPrice) : holding?.quantity ?? 0;
  const total = currentPrice * quantity;
  const holdingValue = (holding?.quantity ?? 0) * currentPrice;
  const holdingProfit = holding ? (currentPrice - holding.averagePrice) * holding.quantity : 0;
  const holdingRate = holding ? (currentPrice - holding.averagePrice) / holding.averagePrice * 100 : 0;

  if (!stock || !quote) return <PhoneShell><ScreenHeader title="기업 정보" onBack={() => router.back()} /><p className="p-8 text-center">등록되지 않은 기업이야.</p></PhoneShell>;

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
          <div className="mt-4 grid grid-cols-2 gap-2">
            {chartTypes.map((type) => <button key={type.value} type="button" onClick={() => setChartType(type.value)} aria-pressed={chartType === type.value} className={`rounded-full border px-3 py-2 text-xs font-bold ${chartType === type.value ? "border-navy bg-navy text-white" : "border-gray bg-white text-ink"}`}>{type.label}</button>)}
          </div>
          {chart.length > 0
            ? <TradingViewChart key={`${chartPeriod}:${chartType}`} points={chart} livePrice={currentPrice} positive={currentPrice >= (chartValues[0] ?? currentPrice)} period={chartPeriod} chartType={chartType} trades={chartTrades} viewer={viewer} onSelectTrade={(trade) => router.push(`/feed?trade=${trade.id}`)} />
            : <div role="status" className="flex h-56 items-center justify-center text-sm opacity-60">{chartErrors[chartPeriod] ? "차트 데이터를 불러오지 못했어." : "차트를 불러오는 중이야…"}</div>}
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
