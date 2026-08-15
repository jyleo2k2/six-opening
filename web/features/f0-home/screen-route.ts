import type { ChatContext, ChatUiAction } from "../../shared/types/chatbot";

/**
 * 화면 ↔ 주소 매핑.
 *
 * 화면 전환은 `app.html` 안의 `screen` 상태가 소유하고 주소는 항상 `/` 였다. 그래서
 * 특정 화면으로 링크를 걸 수 없고 뒤로가기도 동작하지 않는다. 화면을 실제 라우트로
 * 옮기는 작업(해체)의 첫 단계로 **주소부터 화면을 가리키게** 한다. 렌더링은 그대로
 * `app.html` 이 하므로 화면은 바뀌지 않는다.
 *
 * 들어오는 방향(주소 → 화면)은 `openRequestedScreen` 이 이미 처리하는 `open_screen`
 * 액션으로 옮긴다. 나가는 방향(화면 → 주소)은 `app.html` 이 보내는 챗봇 맥락을 쓴다.
 *
 * **[제약]** 나가는 방향의 화면 값은 챗봇용으로 뭉뚱그려져 있다(`home`·`stock`·`order`·
 * `archive`). 그래서 홈·탐색·랭킹·계좌가 모두 `/` 하나로 모이고, 상세·차트·뉴스도
 * `/stock/{code}` 하나로 모인다. `app.html` 이 원래 화면 이름을 함께 보내면 그때
 * 세분화한다 — 이 파일의 매핑은 이미 그 목록을 받을 수 있게 되어 있다.
 */

const STOCK_CODE = /^\d{6}$/u;

/** 주소로 표현하는 화면. `app.html` 의 `screen` 상태보다 거칠다(위 제약 참고). */
export type ScreenRoute =
  | { screen: "home" }
  | { screen: "explore" }
  | { screen: "ranking" }
  | { screen: "portfolio" }
  | { screen: "archive" }
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
  return null;
}

/** `{ screen: "archive" }` → `/archive`. */
export function pathFromRoute(route: ScreenRoute): string {
  switch (route.screen) {
    case "home":
      return "/";
    case "stock":
      return `/stock/${route.code}`;
    case "order":
      return `/${route.side}/${route.code}`;
    default:
      return `/${route.screen}`;
  }
}

/**
 * 주소를 `app.html` 이 이해하는 화면 이동 지시로 바꾼다.
 *
 * 홈도 지시를 보낸다. 앱이 홈에서 시작하니 필요 없어 보이지만, 옮겨 온 화면(`/ranking`)에서
 * 돌아올 때는 화면 임시값을 되살리므로 **떠나기 전 화면**에서 시작한다. 홈을 눌렀는데
 * 매수 화면이 뜨는 것을 막으려면 주소가 시킨 화면을 분명히 말해야 한다.
 */
export function actionFromRoute(route: ScreenRoute): ChatUiAction | null {
  switch (route.screen) {
    case "home":
      return { type: "open_screen", target: "home" };
    case "explore":
      return { type: "open_screen", target: "stock", stockView: "explore" };
    case "ranking":
      return { type: "open_screen", target: "ranking" };
    case "portfolio":
      return { type: "open_screen", target: "portfolio" };
    case "archive":
      return { type: "open_screen", target: "archive", archiveTab: "report" };
    case "stock":
      return {
        type: "open_screen",
        target: "stock",
        stockView: "detail",
        stockId: `KRX:${route.code}`,
      };
    case "order":
      return {
        type: "open_screen",
        target: "order",
        orderSide: route.side,
        orderStep: "quantity",
        stockId: `KRX:${route.code}`,
      };
  }
}

/**
 * `app.html` 이 보내는 챗봇 맥락을 주소로 바꾼다.
 *
 * 맥락의 `screen` 은 챗봇용으로 뭉뚱그려진 값이라 여기서 되살릴 수 있는 화면도 그만큼이다.
 * 원래 화면 이름은 `routeFromAppScreen` 이 받으며, 이 함수는 그 메시지를 못 받았을 때의 폴백이다.
 * 종목 코드가 없는 `stock`·`order` 는 주소로 만들 수 없으므로 `null` 을 준다 —
 * 호출한 쪽이 주소를 건드리지 않는다.
 */
export function routeFromChatContext(context: ChatContext): ScreenRoute | null {
  if (context.screen === "home") return { screen: "home" };
  if (context.screen === "archive") return { screen: "archive" };

  const code = typeof context.stockId === "string" ? context.stockId.slice(4) : "";
  if (!STOCK_CODE.test(code)) return null;
  if (context.screen === "stock") return { screen: "stock", code };
  // 맥락만으로는 매수·매도를 구분할 수 없다. 주소는 종목까지만 좁힌다.
  if (context.screen === "order") return { screen: "stock", code };
  return null;
}

/**
 * `app.html` 의 **원래 화면 이름**을 주소로 바꾼다 (`kiwoom:screen` 메시지).
 *
 * 챗봇 맥락과 달리 홈·탐색·랭킹·계좌가 구분되고 매수·매도도 갈린다.
 * 여기 없는 화면(`chart`·`news`)은 종목 상세와 같은 주소를 쓴다 — 아직 자기 주소가 없고,
 * 상세에서 열리는 하위 화면이라 뒤로 가면 상세로 돌아온다.
 */
export function routeFromAppScreen(screen: string, code: string | null): ScreenRoute | null {
  switch (screen) {
    case "home":
      return { screen: "home" };
    case "explore":
      return { screen: "explore" };
    case "ranking":
      return { screen: "ranking" };
    case "portfolio":
      return { screen: "portfolio" };
    case "archive":
      return { screen: "archive" };
    case "detail":
    case "chart":
    case "news":
      return code && STOCK_CODE.test(code) ? { screen: "stock", code } : null;
    case "buy":
    case "sell":
      return code && STOCK_CODE.test(code)
        ? { screen: "order", code, side: screen }
        : null;
    default:
      return null;
  }
}
