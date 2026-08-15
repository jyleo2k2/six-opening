"use client";

import { useEffect, useState } from "react";
import type { AccountUser } from "./home-view";

/**
 * 로그인 사용자의 서버 계좌. `app.html` 의 `loadDbUser()` 와 같은 경로를 쓴다.
 *
 * 홈은 이 값으로 아빠/엄마/아이 화면을 가른다. 못 받았으면 `null` 이고 홈은 그동안
 * 아이 계정 데모를 그린다 — 빈 화면보다는 낫다는 `app.html` 의 판단을 그대로 따른다.
 */
export function useAccount() {
  const [user, setUser] = useState<AccountUser | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/account", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: (AccountUser & { user_id?: number }) | null) => {
        if (alive && data?.user_id) setUser(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return user;
}
