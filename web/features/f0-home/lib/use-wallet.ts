"use client";

import { useCallback, useEffect, useState } from "react";
import { migrateLegacyAccount } from "../../f2-trade/lib/scheduled-orders.js";
import {
  persistWallet,
  readPersistedWallet,
  seedAccounts,
} from "../../../shared/store/prototype-account.js";
import type { Account } from "./portfolio-view";

/**
 * 옮겨 온 화면이 지갑을 읽고 쓴다.
 *
 * `app.html` 과 **같은 칸**(`kw_proto_v1`)을 쓴다. 여기서 예약 주문을 취소하면 아직 옮기지
 * 않은 화면도 그 결과를 본다. 반대로 저장을 빠뜨리면 화면을 옮기는 순간 되돌아간다.
 *
 * 화면 인계 표시는 건드리지 않는다 — 그건 `app.html` 이 한 번 쓰고 버린다.
 */
export type Wallet = {
  acc: Record<string, Account>;
  records: unknown[];
  sellRecords: unknown[];
  events: unknown[];
  seq?: number;
  watchlist: string[];
};

export type WalletAccountId = "child" | "parent";

/** 서버에는 저장소가 없다. 마운트 전에는 `null` 이고 화면은 그동안 아무것도 그리지 않는다. */
export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    const seeded: Wallet = {
      acc: seedAccounts(),
      records: [],
      sellRecords: [],
      events: [],
      watchlist: [],
    };
    setWallet({ ...seeded, ...readPersistedWallet(migrateLegacyAccount) });
  }, []);

  const update = useCallback((change: (current: Wallet) => Partial<Wallet>) => {
    setWallet((current) => {
      if (!current) return current;
      const next = { ...current, ...change(current) };
      persistWallet(next);
      return next;
    });
  }, []);

  return { wallet, update };
}

/**
 * 자녀는 정규장(평일 09:00~15:30) 동안 매매가 잠긴다.
 *
 * **[제약]** 시연용 강제 설정(`forceSchool`)은 `app.html` 의 화면 상태라 저장되지 않는다.
 * 그래서 옮겨 온 화면은 시계만 보고 판단한다 — 오른쪽 패널로 '학교 시간'을 강제해도
 * 이 화면에는 반영되지 않는다. 강제 설정이 저장 대상이 되면 그때 같이 읽는다.
 */
export function isSchoolTime(now = new Date()) {
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  return day >= 1 && day <= 5 && hour >= 9 && hour < 15.5;
}

export function canTrade(account: WalletAccountId, now = new Date()) {
  if (account === "parent") return true;
  return !isSchoolTime(now);
}
