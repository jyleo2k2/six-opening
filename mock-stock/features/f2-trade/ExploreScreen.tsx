"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { stocks } from "@/shared/data/stocks";
import { useLiveQuotes } from "@/shared/data/use-live-quotes";
import { Chip, LoadingScreen, PhoneShell, PriceText, ScreenHeader } from "@/shared/ui";

const sectors = ["전체", ...new Set(stocks.map((stock) => stock.sector))];

export function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("전체");
  const categoryDrag = useRef({ active: false, moved: false, pointerId: -1, startX: 0, scrollLeft: 0 });
  const { quotes, loading, loadedCount, totalCount, live } = useLiveQuotes(stocks.map((stock) => stock.symbol));
  const filtered = useMemo(() => stocks.filter((stock) => (sector === "전체" || stock.sector === sector) && stock.name.toLowerCase().includes(query.trim().toLowerCase())), [query, sector]);

  const startCategoryDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    categoryDrag.current = { active: true, moved: false, pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
  };

  const moveCategoryDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = categoryDrag.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 3 && !drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.currentTarget.scrollLeft = drag.scrollLeft - distance;
    if (drag.moved) event.preventDefault();
  };

  const endCategoryDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = categoryDrag.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    drag.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    requestAnimationFrame(() => { drag.moved = false; });
  };

  if (loading) return <PhoneShell><LoadingScreen loaded={loadedCount} total={totalCount} message="기업 시세를 모으고 있어" /></PhoneShell>;

  return (
    <PhoneShell>
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden min-[500px]:h-[calc(100dvh-40px)]">
        <ScreenHeader title="종목 탐색" onBack={() => history.back()} right={<span className="rounded-full border border-white px-2 py-1 text-[10px] font-bold">민지</span>} />
        <section className="shrink-0 bg-navy px-5 pb-6">
          <label className="flex h-12 items-center gap-3 rounded-xl bg-white px-4"><span className="text-xl opacity-50">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="어떤 회사를 찾아볼까?" /></label>
        </section>
        <section className="flex min-h-0 flex-1 flex-col px-4 py-4">
          <div
            className="no-scrollbar flex shrink-0 cursor-grab select-none gap-2 overflow-x-auto pb-3 active:cursor-grabbing"
            onPointerDown={startCategoryDrag}
            onPointerMove={moveCategoryDrag}
            onPointerUp={endCategoryDrag}
            onPointerCancel={endCategoryDrag}
            onClickCapture={(event) => { if (categoryDrag.current.moved) { event.preventDefault(); event.stopPropagation(); } }}
          >{sectors.map((item) => <Chip key={item} selected={sector === item} onClick={() => setSector(item)} className="shrink-0 whitespace-nowrap">{item}</Chip>)}</div>
          <div className="my-3 flex shrink-0 items-center justify-between text-xs opacity-60"><span>기업 목록 · {filtered.length}개</span><span className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${live ? "bg-up" : "bg-gray"}`} />{live ? "키움 시세 반영" : "데모 시세"}</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl bg-white px-3 shadow-card">
            {filtered.map((stock) => {
              const quote = quotes[stock.symbol] ?? stock;
              return <Link key={stock.symbol} href={`/trade/${stock.symbol}`} className="flex items-center gap-3 border-b border-gray px-1 py-4 last:border-0"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg text-[10px] font-extrabold text-navy">{stock.logo}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{stock.name}</strong><span className="mt-1 block text-[11px] opacity-60">{stock.symbol} · {stock.sector}</span></span><span className="text-right"><strong className="block text-sm tabular-nums">{quote.price.toLocaleString()}원</strong><span className="mt-1 block text-[11px]"><PriceText value={quote.change} rate={quote.rate} compact /></span></span></Link>;
            })}
            {filtered.length === 0 && <p className="py-16 text-center text-sm opacity-60">찾는 회사가 없어. 다른 이름을 입력해볼까?</p>}
          </div>
        </section>
      </div>
    </PhoneShell>
  );
}
