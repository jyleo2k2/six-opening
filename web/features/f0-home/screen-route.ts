/**
 * 화면 ↔ 주소 매핑.
 *
 * 화면 전환은 한때 `app.html` 안의 `screen` 상태가 소유했고 주소는 항상 `/` 였다. 화면을
 * 실제 라우트로 옮기면서 주소가 화면을 가리키게 됐고, iframe 을 걷어낸 지금은 이 파일의
 * 두 함수가 주소의 전부다 — `routeFromPath` 가 아는 주소만 앱이고 나머지는 404 다.
 */

const STOCK_CODE = /^\d{6}$/u;

/** 아카이브 안의 자리. `report` 는 기본이라 주소에 적지 않는다. */
const ARCHIVE_VIEWS = ["return", "cards", "family"];

/** 주소로 표현하는 화면. `app.html` 의 `screen` 상태보다 거칠다(위 제약 참고). */
export type ScreenRoute =
  | { screen: "home" }
  /** `sector` 는 탐색의 필터 칩 — `rank`(기본)·`watch`·유니버스 섹터 id. 챗봇의 섹터 점프가 쓴다. */
  | { screen: "explore"; sector?: string }
  | { screen: "ranking" }
  | { screen: "portfolio" }
  /**
   * `view` 는 아카이브 안에서 어디를 보고 있는지 — `report`(기본)·`return`·`cards`·`family`.
   * 챗봇이 "내 성향 카드 보여줘" 로 바로 뛰어드는 자리라 주소로 표현한다.
   */
  | { screen: "archive"; view?: string }
  | { screen: "stock"; code: string }
  | { screen: "order"; code: string; side: "buy" | "sell" };

/** 주소에서 첫 칸으로 쓰는 이름. 여기 없는 경로는 앱이 아니다(404). */
export const SCREEN_SEGMENTS = [
  "explore",
  "ranking",
  "portfolio",
  "archive",
  "stock",
  "buy",
  "sell",
] as const;

/** `/archive` → `{ screen: "archive" }`. 모르는 경로는 `null` 이라 호출한 쪽이 404 를 낸다. */
export function routeFromPath(pathname: string): ScreenRoute | null {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { screen: "home" };

  const [head, second] = parts;
  if (parts.length === 1) {
    if (head === "explore") return { screen: "explore" };
    if (head === "ranking") return { screen: "ranking" };
    if (head === "portfolio") return { screen: "portfolio" };
    if (head === "archive") return { screen: "archive" };
    return null;
  }
  if (parts.length === 2 && STOCK_CODE.test(second)) {
    if (head === "stock") return { screen: "stock", code: second };
    if (head === "buy") return { screen: "order", code: second, side: "buy" };
    if (head === "sell") return { screen: "order", code: second, side: "sell" };
  }
  // 섹터 id 는 소문자 영문이다. 모르는 값은 화면이 기본(오늘 많이 오른 순)으로 되돌린다.
  if (parts.length === 2 && head === "explore" && /^[a-z]+$/u.test(second)) {
    return { screen: "explore", sector: second };
  }
  if (parts.length === 2 && head === "archive" && ARCHIVE_VIEWS.includes(second)) {
    return { screen: "archive", view: second };
  }
  return null;
}

/** `{ screen: "archive" }` → `/archive`. */
export function pathFromRoute(route: ScreenRoute): string {
  switch (route.screen) {
    case "home":
      return "/";
    case "explore":
      return route.sector ? `/explore/${route.sector}` : "/explore";
    case "archive":
      return route.view ? `/archive/${route.view}` : "/archive";
    case "stock":
      return `/stock/${route.code}`;
    case "order":
      return `/${route.side}/${route.code}`;
    default:
      return `/${route.screen}`;
  }
}
