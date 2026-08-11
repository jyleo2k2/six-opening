"use client";

import { useEffect, useMemo, useState } from "react";
import { stockBySymbol } from "@/shared/data/stocks";
import { stocks } from "@/shared/data/stocks";
import type { Quote } from "@/shared/types";

function fixtureQuote(symbol: string): Quote | undefined {
  const stock = stockBySymbol.get(symbol);
  return stock ? { symbol, name: stock.name, price: stock.price, change: stock.change, rate: stock.rate, updatedAt: new Date().toISOString(), source: "fixture" } : undefined;
}

const allSymbols = stocks.map((stock) => stock.symbol);
const bootstrapSymbols = allSymbols.slice(0, 6);
let runtimeQuotes: Record<string, Quote | undefined> = Object.fromEntries(allSymbols.map((symbol) => [symbol, fixtureQuote(symbol)]));
let runtimeBootstrapped = false;
const runtimeLoadedSymbols = new Set<string>();

export function useLiveQuotes(symbols: string[]) {
  const symbolKey = symbols.join(",");
  const initial = useMemo(() => ({ ...runtimeQuotes }), [symbolKey]);
  const [quotes, setQuotes] = useState<Record<string, Quote | undefined>>(initial);
  const [bootstrapped, setBootstrapped] = useState(runtimeBootstrapped);
  const [loadedCount, setLoadedCount] = useState(runtimeLoadedSymbols.size);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let index = 0;
    setQuotes({ ...runtimeQuotes });
    setBootstrapped(runtimeBootstrapped);
    setLoadedCount(runtimeLoadedSymbols.size);

    const refreshNext = async () => {
      const pollSymbols = runtimeBootstrapped ? symbols : bootstrapSymbols;
      if (cancelled || pollSymbols.length === 0) return;
      const startedAt = Date.now();
      const symbol = pollSymbols[index % pollSymbols.length];
      try {
        const response = await fetch(`/api/quote/${symbol}`, { cache: "no-store" });
        if (response.ok) {
          const quote = await response.json() as Quote;
          runtimeQuotes = { ...runtimeQuotes, [symbol]: quote };
          if (!cancelled) setQuotes({ ...runtimeQuotes });
        }
      } catch {
        // The fixture remains available when local credentials or the network are unavailable.
      } finally {
        if (!cancelled) {
          if (!runtimeBootstrapped) {
            runtimeLoadedSymbols.add(symbol);
            setLoadedCount(runtimeLoadedSymbols.size);
            if (runtimeLoadedSymbols.size === bootstrapSymbols.length) {
              runtimeBootstrapped = true;
              setBootstrapped(true);
              index = 0;
            } else {
              index = (index + 1) % bootstrapSymbols.length;
            }
          } else {
            index = (index + 1) % Math.max(1, symbols.length);
          }
          timer = setTimeout(refreshNext, Math.max(0, 1100 - (Date.now() - startedAt)));
        }
      }
    };

    refreshNext();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [initial, symbolKey]);

  return {
    quotes,
    loading: !bootstrapped,
    loadedCount,
    totalCount: bootstrapSymbols.length,
    live: Object.values(quotes).some((quote) => quote?.source === "kiwoom"),
  };
}
