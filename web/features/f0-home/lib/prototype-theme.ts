/**
 * 프로토타입 원본이 정한 화면 바탕색과 주문 CTA.
 *
 * 원본은 `design-system/prototype/모의투자-화면-프로토타입.html` 하나다. 화면을 React 로
 * 옮기는 동안 그 원본과 두 번 어긋났고, 둘 다 "원본이 한 곳에 둔 값을 여러 곳에 흩뿌렸다"는
 * 같은 모양의 사고였다.
 *
 * - **바탕색** — 원본은 폰 화면 컨테이너(42행) 한 곳에만 색을 두고 화면 루트는 전부 투명하게
 *   얹는다. iframe 을 철거하며 그 컨테이너가 `PhoneFrame` 으로 넘어왔는데 색이 같이 오지 않아
 *   원본에 없는 `#F5F2F8` 이 자리를 대신했고, 뒤늦게 탐색 화면만 자기 루트에 색을 다시 박아
 *   **그 화면만 맞는** 상태로 굳었다. 화면 루트는 배경을 갖지 않는다 — 컨테이너가 정한다.
 * - **주문 CTA** — 원본에는 분홍 버튼이 둘이다. 매수·매도 각 단계가 쓰는 범용 `CTA_ON` 과,
 *   종목 상세·차트만 쓰는 `detailBuyStyle` 은 서로 다른 버튼이다. 상세·차트·뉴스 푸터를
 *   `StockFooter` 한 벌로 합치면서 범용 쪽 하나만 남아 상세의 버튼이 진해졌다.
 *
 * 값은 원본 문자열 그대로 둔다. `flex:1` 처럼 지금 부모에서 효과가 없는 선언도 지우지 않는다 —
 * `prototype-parity.test.ts` 가 원본 HTML 에서 같은 문자열을 뽑아 글자 단위로 대조하므로,
 * 다듬는 순간 대조가 깨져서 알려 준다. 원본을 고치고 싶으면 HTML 을 먼저 고친다.
 */

/**
 * 원본 42행 — 폰 화면 컨테이너의 바탕색. `PhoneFrame` 만 쓴다.
 *
 * 아카이브 화면만 원본(1137행)에서 `#F7F6FB` 로 덮으므로 그 화면은 자기 루트에서 색을 갖는다.
 * 그 하나가 유일한 예외다.
 */
export const SCREEN_BG = "#F4F0FF";

/**
 * 원본 `detailBuyStyle` — 종목 상세·차트의 "주문하기".
 *
 * 범용 `CTA_ON_CSS` 보다 한 단계 연하고(#F5589B 에서 멎는다) 바깥 그림자 대신 inset 으로
 * 부풀린다. 잠금(학교 시간)일 때도 색이 바뀌지 않는다 — 원본은 손잡이를 회색으로 만드는 대신
 * 위에 안내 배너를 띄우고 누름만 막는다.
 */
export const DETAIL_BUY_CSS =
  "position:relative;flex:1;text-align:center;border-radius:999px;padding:18px;font-size:18px;font-weight:800;letter-spacing:-0.01em;color:#fff;cursor:pointer;" +
  "background:linear-gradient(180deg,#FF9EC4 0%,#FB7BAD 46%,#F5589B 100%);" +
  "box-shadow:inset 0 1.5px 1px rgba(255,255,255,0.62),inset 0 -2px 3px rgba(206,45,110,0.3),0 6px 16px -6px rgba(245,88,155,0.6)";

/** 원본 `CTA_ON` — 매수·매도 각 단계와 뉴스 화면의 "살래(매수)". */
export const CTA_ON_CSS =
  "position:relative;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em;cursor:pointer;" +
  "background:radial-gradient(ellipse 56% 48% at 46% -8%,rgba(255,251,248,0.94) 0%,rgba(255,238,245,0.42) 38%,rgba(255,255,255,0.06) 70%,rgba(255,255,255,0) 92%)," +
  "radial-gradient(ellipse 94% 48% at 50% 120%,rgba(255,202,226,0.6) 0%,rgba(255,202,226,0) 78%)," +
  "linear-gradient(180deg,#FFA0C6 0%,#FC7DAF 34%,#F663A1 66%,#EE4A8E 100%);" +
  "box-shadow:5px 16px 26px -9px rgba(214,54,124,0.4),8px 34px 48px -20px rgba(214,54,124,0.24),inset 0 -24px 32px -16px rgba(255,255,255,0.42),inset 0 4px 6px rgba(255,255,255,0.5)";

/** 원본 `CTA_OFF` — 범용 CTA 가 눌리지 않을 때. */
export const CTA_OFF_CSS =
  "position:relative;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#FFFFFF;letter-spacing:-0.01em;cursor:not-allowed;background:#C6C9D8";
