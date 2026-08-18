"use client";

import { useCallback, useEffect, useState } from "react";
import type { RestrictionState, TradeRestriction } from "./trade-restriction";

/**
 * 학교 시간 거래 제한 상태. 부모 화면은 고치려고, 아이 화면은 지금 막혔는지 알려고 읽는다.
 *
 * `use-account` 처럼 응답을 모듈에 담아 두되 **화면이 뜰 때마다 다시 읽는다.** 담아 둔
 * 값은 첫 그림이 번쩍이지 않게 하는 용도이고, 막혔는지는 시간이 지나면 바뀌므로 낡은
 * 값을 그대로 믿으면 안 된다. 실제로 막는 것은 서버(`api/trade`·`api/orders`)라
 * 화면이 한 박자 늦어도 주문이 새어 나가지는 않는다.
 */
let cached: RestrictionState | null = null;

async function fetchRestriction(): Promise<RestrictionState | null> {
  try {
    const response = await fetch("/api/trade-restriction", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as RestrictionState;
    cached = data;
    return data;
  } catch {
    return null;
  }
}

export function useTradeRestriction() {
  const [state, setState] = useState<RestrictionState | null>(cached);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchRestriction().then((loaded) => {
      if (alive && loaded) setState(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** 저장이 성공해야 화면 값을 바꾼다 — 서버가 거절한 설정을 켜진 것처럼 보이면 안 된다. */
  const save = useCallback(async (rule: TradeRestriction): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await fetch("/api/trade-restriction", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as RestrictionState;
      cached = data;
      setState(data);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { state, save, saving };
}
