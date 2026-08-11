"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { stocks, stockBySymbol } from "@/shared/data/stocks";
import { useLiveQuotes } from "@/shared/data/use-live-quotes";
import { useInvestmentStore } from "@/shared/store/use-investment-store";
import { Card, LoadingScreen, PhoneShell, PriceText, TabBar } from "@/shared/ui";

export function PortfolioScreen() {
  const [mounted, setMounted] = useState(false);
  const cash = useInvestmentStore((state) => state.cash);
  const holdings = useInvestmentStore((state) => state.holdings);
  const symbols = holdings.map((holding) => holding.symbol);
  const { quotes, loading, loadedCount, totalCount, live } = useLiveQuotes(symbols);
  useEffect(() => setMounted(true), []);

  const visibleHoldings = mounted ? holdings : [
    { symbol: "005930", quantity: 3, averagePrice: 71680 },
    { symbol: "000660", quantity: 2, averagePrice: 192550 },
    { symbol: "005380", quantity: 1, averagePrice: 238800 },
  ];
  const visibleCash = mounted ? cash : 168500;
  const marketValue = visibleHoldings.reduce((sum, holding) => sum + (quotes[holding.symbol]?.price ?? stockBySymbol.get(holding.symbol)?.price ?? 0) * holding.quantity, 0);
  const cost = visibleHoldings.reduce((sum, holding) => sum + holding.averagePrice * holding.quantity, 0);
  const profit = marketValue - cost;
  const profitRate = cost ? profit / cost * 100 : 0;
  const total = marketValue + visibleCash;

  if (!mounted || loading) return <PhoneShell><LoadingScreen loaded={mounted ? loadedCount : 0} total={mounted ? totalCount : 3} /></PhoneShell>;

  return (
    <PhoneShell>
      <header className="bg-navy px-5 pb-14 pt-7 text-white">
        <div className="flex items-start justify-between">
          <div><p className="text-sm opacity-80">안녕, 민지야!</p><h1 className="mt-2 text-2xl font-extrabold">내 포트폴리오</h1></div>
          <button className="rounded-full border border-white px-3 py-2 text-xs font-bold">민지 ▾</button>
        </div>
      </header>
      <section className="-mt-9 space-y-4 px-4 pb-5">
        <Card className="flex items-center justify-between p-5">
          <div><p className="text-xs font-bold opacity-60">내 투자금</p><p className="mt-2 text-3xl font-extrabold tabular-nums">{Math.round(total).toLocaleString()}원</p><div className="mt-3 flex items-center gap-2 text-xs"><PriceText value={Math.round(profit)} rate={profitRate} /></div></div>
          <div className="flex h-16 w-16 items-end justify-center gap-1 rounded-2xl bg-bg p-3"><i className="h-5 w-2 rounded-full bg-magenta"/><i className="h-8 w-2 rounded-full bg-magenta opacity-70"/><i className="h-11 w-2 rounded-full bg-magenta opacity-40"/></div>
        </Card>

        <div className="flex items-end justify-between px-1"><div><h2 className="text-lg font-extrabold">내가 가진 주식</h2><p className="mt-1 text-xs opacity-60">종목을 누르면 자세히 보고 매도할 수 있어</p></div><span className="text-xs font-bold opacity-60">{visibleHoldings.length}개</span></div>
        <Card className="divide-y divide-gray p-2">
          {visibleHoldings.length === 0 && <p className="p-8 text-center text-sm opacity-60">아직 가진 주식이 없어. 새로운 회사를 살펴볼까?</p>}
          {visibleHoldings.map((holding) => {
            const stock = stockBySymbol.get(holding.symbol);
            if (!stock) return null;
            const price = quotes[holding.symbol]?.price ?? stock.price;
            const value = price * holding.quantity;
            const pnl = (price - holding.averagePrice) * holding.quantity;
            const rate = (price - holding.averagePrice) / holding.averagePrice * 100;
            return <Link href={`/trade/${holding.symbol}`} key={holding.symbol} className="flex items-center gap-3 rounded-xl px-2 py-4 transition hover:bg-bg"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg text-[11px] font-extrabold text-navy">{stock.logo}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{stock.name}</strong><span className="mt-1 block text-xs opacity-60">{holding.quantity}주 · {value.toLocaleString()}원</span></span><span className="text-right text-xs"><PriceText value={Math.round(pnl)} rate={rate} /></span></Link>;
          })}
        </Card>

        <Card className="flex items-center justify-between"><div><p className="text-xs font-bold opacity-60">투자할 수 있는 돈</p><p className="mt-1 text-base font-extrabold tabular-nums">{visibleCash.toLocaleString()}원</p></div><span className="text-2xl opacity-50">›</span></Card>
        <Link href="/stocks" className="flex min-h-14 items-center justify-center rounded-xl bg-magenta text-[15px] font-extrabold text-white">⌕&nbsp;&nbsp;새로운 회사 찾아보기</Link>
        <p className="text-center text-[11px] opacity-60">{live ? "키움 시세를 종목별 1.1초 간격으로 순환 확인하고 있어." : "키움 연결이 어려워 데모 시세를 보여주고 있어."}</p>
      </section>
      <TabBar />
    </PhoneShell>
  );
}
