"use client";

import { useEffect, useState } from "react";
import type { AccountUser } from "./home-view";
import type { ServerAccount } from "./server-account";

/**
 * 로그인 사용자의 서버 계좌. `app.html` 의 `loadDbUser()` 와 같은 경로를 쓴다.
 *
 * 응답은 모듈에 한 번만 담아 둔다. 이관된 화면은 탭을 오갈 때마다 마운트를 새로 하는데,
 * 그때마다 다시 부르면 응답이 올 때까지 데모 화면이 한 번씩 번쩍인다 — `app.html` 이
 * 세션당 한 번만 읽는 것과 같은 이유로 여기서도 한 번만 읽는다.
 * 실패·비로그인 응답은 담아 두지 않아 다음 화면이 다시 시도한다.
 */
let accountPromise: Promise<ServerAccount | null> | null = null;
let cachedUser: ServerAccount | null = null;

/**
 * 다음 조회가 서버를 다시 읽게 한다. 주문 접수·취소·정산은 잔액과 잠긴 금액을 바꾸므로
 * 세션당 한 번 읽은 값이 그대로 남으면 화면이 이미 쓴 돈을 아직 쓸 수 있다고 보인다.
 * `cachedUser` 는 남긴다 — 그건 역할 판정용이고, 비우면 데모 화면이 다시 번쩍인다.
 */
export function invalidateAccount() {
  accountPromise = null;
}

export function loadAccount(): Promise<ServerAccount | null> {
  if (!accountPromise) {
    accountPromise = fetch("/api/account", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data: (ServerAccount & { user_id?: number }) | null) => {
        if (data?.user_id) {
          cachedUser = data;
          return data;
        }
        accountPromise = null;
        return null;
      });
  }
  return accountPromise;
}

/**
 * 홈은 이 값으로 아빠/엄마/아이 화면을 가른다. 못 받았으면 `null` 이고 홈은 그동안
 * 아이 계정 데모를 그린다 — 빈 화면보다는 낫다는 `app.html` 의 판단을 그대로 따른다.
 * 한 번 받은 뒤로는 초기값이 캐시라 재방문에 데모가 끼어들 틈이 없다.
 */
export function useAccount() {
  const [user, setUser] = useState<AccountUser | null>(cachedUser);

  useEffect(() => {
    let alive = true;
    loadAccount().then((loaded) => {
      if (alive && loaded) setUser(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  return user;
}
