"use client";

import { useCallback, useEffect, useState } from "react";
import {
  migrateLegacyAccount,
  pendingFromServerOrders,
} from "../../f2-trade/lib/scheduled-orders.js";
import {
  persistWallet,
  readPersistedWallet,
  seedAccounts,
} from "../../../shared/store/prototype-account.js";
import type { Account } from "./portfolio-view";
import { applyServerAccount } from "./server-account";
import { invalidateAccount, loadAccount } from "./use-account";

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

/**
 * 서버에는 저장소가 없다. 마운트 전에는 `null` 이고 화면은 그동안 아무것도 그리지 않는다.
 *
 * **로그인한 역할의 현금·보유는 `/api/account` 가 원본이다.** `app.html` 도 같은 응답을
 * `applyServerHoldings()` 로 반영하지만 그건 자기 메모리에만 쓰고 `persist()` 를 거치지
 * 않아 `kw_proto_v1` 에는 서버 값이 절대 남지 않는다. 옮겨 온 화면은 그 메모리를 볼 수
 * 없으므로, 저장소만 읽으면 DB 에 무엇이 있든 `seedAccounts()` 하드코딩 값을 그린다.
 *
 * 응답을 기다렸다가 **한 번에** 세운다. 저장소 값을 먼저 그리고 나중에 덮으면 시드 지갑이
 * 한 프레임 보였다 바뀐다 — 첫 렌더 전에 되살리기로 한 이유(PR #217)와 같다.
 * 계좌는 `loadAccount()` 모듈 캐시를 같이 쓴다. 저장소(`kw_proto_v1`)는 iframe 화면이
 * 사이에 쓸 수 있으므로 마운트마다 다시 읽지만, 서버 왕복은 세션당 한 번이면 된다.
 *
 * 미체결 주문도 같이 읽는다. `GET /api/orders` 는 만기가 지난 예약을 먼저 정산하므로,
 * 이 조회가 곧 예약 체결 트리거다 — 화면이 따로 시가를 확인하지 않는다. 정산은 잔액을
 * 바꾸므로 그때는 계좌 캐시를 비우고 한 번 더 읽는다.
 */
type OpenOrders = { orders?: Record<string, unknown>[]; settled?: unknown[] };

const readOpenOrders = (): Promise<OpenOrders | null> =>
  fetch("/api/orders", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [reload, setReload] = useState(0);
  /**
   * 주문을 취소한 뒤처럼 서버 상태가 바뀐 것을 아는 쪽에서 다시 읽게 한다.
   * 예약은 잔액도 함께 움직이므로 계좌 캐시를 비우고 시작한다.
   */
  const refresh = useCallback(() => {
    invalidateAccount();
    setReload((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    const seeded: Wallet = {
      acc: seedAccounts(),
      records: [],
      sellRecords: [],
      events: [],
      watchlist: [],
    };
    const local: Wallet = { ...seeded, ...readPersistedWallet(migrateLegacyAccount) };
    // 계좌나 주문을 못 읽어도 화면은 떠야 한다. 그때는 저장소 값 그대로다.
    Promise.all([loadAccount(), readOpenOrders()]).then(([user, open]) => {
      if (!alive) return;
      const pending = open?.orders ? pendingFromServerOrders(open.orders) : null;
      setWallet({ ...local, acc: applyServerAccount(local.acc, user, pending) });
      // 조회가 만기 예약을 정산했으면 방금 읽은 계좌는 이미 낡았다. 한 번 더 돈다 —
      // 두 번째에는 정산할 것이 없으므로 여기서 멈춘다.
      if (open?.settled?.length) refresh();
    });
    return () => {
      alive = false;
    };
  }, [reload, refresh]);

  const update = useCallback((change: (current: Wallet) => Partial<Wallet>) => {
    setWallet((current) => {
      if (!current) return current;
      const next = { ...current, ...change(current) };
      persistWallet(next);
      return next;
    });
  }, []);

  return { wallet, update, refresh };
}

/**
 * 시연용 스쿨락 강제. `auto` 면 시계를 보고, `on`·`off` 면 시계를 무시한다.
 *
 * 예전에는 `app.html` 오른쪽 패널의 화면 상태(`forceSchool`)였다. 주문 화면까지 React 로
 * 옮기면서 오버레이가 iframe 을 항상 덮게 돼 그 칩을 **누를 수 없게 됐고**, 장중이 아니면
 * 스쿨락을 시연할 방법이 사라졌다. 그래서 판정이 모이는 이 파일로 가져온다.
 *
 * 화면을 오가도 남아야 하므로 `localStorage` 에 적는다. 주소 파라미터로 두면 `openRoute` 가
 * 경로만 `replaceState` 하므로 화면을 옮기는 순간 사라진다.
 */
export type SchoolOverride = "auto" | "on" | "off";

const FORCE_SCHOOL_KEY = "kw_force_school";

// `isSchoolTime` 은 렌더 중에 불린다. 매 렌더마다 저장소를 읽지 않도록 모듈에 들고 있는다.
let override: SchoolOverride = "auto";
let overrideLoaded = false;

function readOverride(): SchoolOverride {
  if (overrideLoaded || typeof window === "undefined") return override;
  const saved = window.localStorage.getItem(FORCE_SCHOOL_KEY);
  if (saved === "on" || saved === "off") override = saved;
  overrideLoaded = true;
  return override;
}

export const schoolOverride = () => readOverride();

export function setSchoolOverride(next: SchoolOverride) {
  override = next;
  overrideLoaded = true;
  if (typeof window === "undefined") return;
  if (next === "auto") window.localStorage.removeItem(FORCE_SCHOOL_KEY);
  else window.localStorage.setItem(FORCE_SCHOOL_KEY, next);
}

/** 자녀는 정규장(평일 09:00~15:30) 동안 매매가 잠긴다. 강제 설정이 있으면 그쪽이 이긴다. */
export function isSchoolTime(now = new Date()) {
  const forced = readOverride();
  if (forced !== "auto") return forced === "on";
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  return day >= 1 && day <= 5 && hour >= 9 && hour < 15.5;
}

export function canTrade(account: WalletAccountId, now = new Date()) {
  if (account === "parent") return true;
  return !isSchoolTime(now);
}
