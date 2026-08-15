import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ConnectedPrototype } from "../../features/f0-home/ConnectedPrototype";
import { routeFromPath } from "../../features/f0-home/screen-route";
import { loadDevelopmentEnvironment } from "../api/dev-env";
import { findProfileById, SESSION_COOKIE } from "../api/supabase";
import { LoginGate } from "../LoginGate";

/**
 * 앱 진입점. 주소가 어느 화면인지 가리키고, **옮겨 온 화면은 여기서 직접 그린다.**
 * 아직 안 옮긴 화면은 `ConnectedPrototype` 이 띄우는 `app.html` iframe 이 그린다.
 * 지금까지 옮긴 화면은 `/ranking` 하나다.
 *
 * `/api/*` 와 `/tradingview-chart` 는 더 구체적인 라우트라 이 캐치올보다 먼저 잡힌다.
 * 여기서 모르는 경로는 앱을 띄우지 않고 404 를 낸다 — 오타가 조용히 홈으로 넘어가면
 * 주소가 화면을 가리킨다는 약속이 깨진다.
 */
async function currentProfile() {
  loadDevelopmentEnvironment();
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  const id = raw ? Number(raw) : NaN;
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    return await findProfileById(id);
  } catch (error) {
    console.error(JSON.stringify({ event: "page_session", result: "error", message: String(error) }));
    return null;
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ screen?: string[] }>;
}) {
  const { screen } = await params;
  const route = routeFromPath(`/${(screen ?? []).join("/")}`);
  if (!route) notFound();

  const profile = await currentProfile();
  // 로그인 전에는 어느 주소로 들어와도 로그인 화면이다. 로그인하면 그 주소의 화면으로 간다.
  if (!profile) return <LoginGate />;
  // 옮긴 화면도 `ConnectedPrototype` 안에서 iframe 위에 얹는다. 여기서 갈라 렌더하면
  // 화면을 옮길 때마다 iframe 이 언마운트돼 `app.html` 이 처음부터 다시 뜬다.
  // 옮긴 화면은 지갑을 직접 읽으므로 누구 계좌인지 알아야 한다. `app.html` 은 `/api/account`
  // 를 기다렸다가 알지만, 여기서는 세션 쿠키로 이미 알고 있으니 첫 렌더부터 넘긴다.
  return (
    <ConnectedPrototype
      account={profile.parent_child === "parent" ? "parent" : "child"}
      route={route}
    />
  );
}
