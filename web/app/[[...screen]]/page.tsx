import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ConnectedPrototype } from "../../features/f0-home/ConnectedPrototype";
import { routeFromPath } from "../../features/f0-home/screen-route";
import { loadDevelopmentEnvironment } from "../api/dev-env";
import { findProfileById, SESSION_COOKIE } from "../api/supabase";
import { LoginGate } from "../LoginGate";

/**
 * 앱 진입점. 화면 전환은 여전히 `app.html` 안의 상태가 소유하지만, **주소가 어느 화면인지
 * 가리킨다.** `/archive` 처럼 직접 열면 그 화면으로 시작하고 뒤로가기도 동작한다.
 * 화면을 실제 라우트로 옮기는 작업의 첫 단계이며, 렌더링은 아직 옮기지 않아 화면은 그대로다.
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
  return <ConnectedPrototype route={route} />;
}
