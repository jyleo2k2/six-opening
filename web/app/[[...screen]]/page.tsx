import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ConnectedPrototype } from "../../features/f0-home/ConnectedPrototype";
import { routeFromPath } from "../../features/f0-home/screen-route";
import { loadDevelopmentEnvironment } from "../api/dev-env";
import { findProfileById, SESSION_COOKIE, sessionUserIdFromCookie } from "../api/supabase";
import { LoginGate } from "../LoginGate";

/**
 * 앱 진입점. 주소가 어느 화면인지 가리키고 `ConnectedPrototype` 이 그 화면을 그린다.
 * 사용자 화면 7종은 전부 React 이고, 목록의 원본은 `screen-route` 의 `ScreenRoute` 다.
 *
 * `/api/*` 와 `/tradingview-chart` 는 더 구체적인 라우트라 이 캐치올보다 먼저 잡힌다.
 * 여기서 모르는 경로는 앱을 띄우지 않고 404 를 낸다 — 오타가 조용히 홈으로 넘어가면
 * 주소가 화면을 가리킨다는 약속이 깨진다.
 */
async function currentProfile() {
  loadDevelopmentEnvironment();
  const store = await cookies();
  // 쿠키를 여기서 직접 뜯지 않는다. 부팅 표식 대조를 `api/supabase.ts` 한곳에 두어야
  // 화면과 API 가 같은 기준으로 로그인 여부를 판단한다.
  const id = sessionUserIdFromCookie(store.get(SESSION_COOKIE)?.value);
  if (id === null) return null;
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
  // 화면은 지갑을 직접 읽으므로 누구 계좌인지 알아야 한다. `/api/account` 응답을
  // 기다릴 수도 있지만 여기서는 세션 쿠키로 이미 알고 있으니 첫 렌더부터 넘긴다 —
  // 기다리면 그동안 시드 지갑이 한 프레임 보였다 바뀐다.
  return (
    <ConnectedPrototype
      account={profile.parent_child === "parent" ? "parent" : "child"}
      route={route}
    />
  );
}
