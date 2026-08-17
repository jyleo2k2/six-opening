import type { ScreenRoute } from "../screen-route";

/**
 * 튜토리얼 코치마크의 내용과 순서.
 *
 * 원본은 `web/public/ui/tutorial.js` 였다. 2026-08-13 병합(`d42d450`)에서 `<script src>`
 * 한 줄이 유실돼 죽었고 하루 뒤 파일까지 지워졌다 — 의도된 삭제가 아니라 사고였다.
 * 여기서 되살리되 세 가지를 바꾼다.
 *
 * 1. **단계를 세지 않고 화면에서 읽는다.** 지금 어느 장인지는 카운터가 아니라 지금 어느
 *    화면에 있는지가 정한다. 아이가 뒤로 가도 설명이 어긋날 수 없다. 원본은 이것을
 *    200ms 폴링으로 DOM 을 뒤져 알아냈지만, 화면이 React 로 넘어온 지금은
 *    `ScreenRoute` 를 읽으면 된다.
 * 2. **말투는 해요체다.** 원본은 반말이었고 정본 톤과 어긋난다.
 * 3. **문안을 지금 화면에 맞춘다.** 버튼 이름은 자리마다 다음·주문하기·팔기로 갈린다.
 *
 * **한 벌짜리 흐름이다** [2026-08-17 확정]. 예전에는 5·8·13 세 길이를 두고 장마다
 * `from` 으로 어느 길이부터 나오는지 적었는데, 화면에 붙인 `ConnectedPrototype` 이 길이를
 * 넘기지 않아 **언제나 8장만 떴다.** 섹터·매수 이유·매도처럼 정작 설명이 필요한 자리가
 * 13장에만 있어 실행 경로에서 한 번도 보이지 않았고, 길이를 고르는 화면도 없었다.
 * 고를 수 없는 선택지를 지우고 사러 가는 길 하나를 끝까지 따라가는 순서로 바꿨다.
 *
 * 흐름은 **홈 → 모의투자 → 섹터 → 종목 카드 → 상세(차트·회사·뉴스) → 매수 3단계 →
 * 매도 3단계** 다. 사고파는 과정을 한 번씩 끝까지 보여 주는 것이 목적이라 계좌·랭킹·
 * 아카이브는 넣지 않는다.
 */

/**
 * 화면 안에서만 바뀌는 자리.
 *
 * 주문 1/2/3 단계와 상세→차트·뉴스는 주소가 안 바뀌어(`useState`) 밖에서는 안 보인다.
 * 화면이 `onLeave` 와 같은 패턴으로 올려 주고, 값은 화면이 이미 쓰는 상태 이름 그대로다.
 */
export type TutorialStage =
  /** `DetailScreen.view` */
  | "detail"
  | "chart"
  | "news"
  /** `OrderScreen.step` — 1 얼마나, 2 왜·언제까지, 3 완료 */
  | "order-1"
  | "order-2"
  | "order-3";

export type TutorialStep = {
  id: string;
  screen: ScreenRoute["screen"];
  /** 없으면 그 화면 어디에 있든 이 장이다. */
  stage?: TutorialStage;
  /**
   * 주문 화면의 매수·매도 구분. 두 흐름이 `screen: "order"` 와 `stage` 를 그대로 공유하므로
   * 이것이 없으면 **매도 화면에 매수 문안이 뜬다**.
   */
  side?: "buy" | "sell";
  /** 짚어 줄 요소의 `id`. 화면에 없으면 구멍 없이 설명만 띄운다. */
  anchors: string[];
  title: string;
  /** 이 자리가 뭘 하는 곳인지. */
  what: string;
  term: string;
  /** 그게 투자에서 무슨 뜻인지. 접어 두었다가 눌러야 펼친다. */
  concept: string;
  /** 접혔을 때 미니바에 남는 말. 방금 읽은 제목이 아니라 **다음에 뭘 할지**를 적는다. */
  hint: string;
  /**
   * 이 자리로 **들어가는 방법**. `다음` 을 누르면 다음 장의 이것을 실행한다.
   *
   * 장이 아니라 자리에 매어 둔 이유는 같은 자리로 여러 길에서 들어올 수 있어서다.
   * 목적지가 제 진입로를 들고 있으면 어디서 오든 맞는다.
   *
   * - `path` — 주소로 바로 간다. `:code` 는 지금 보고 있는 종목 코드로 바꾼다(방금 산
   *   회사를 그대로 팔러 갈 때 쓴다 — 코드는 화면만 안다).
   * - `anchors` — 그 자리로 가는 데 필요한 것을 **적힌 순서대로 한 프레임에 하나씩**
   *   누른다. 화면이 다시 그려져야 다음 버튼이 열리는 자리가 있어서다(금액을 골라야
   *   `다음` 이 켜진다).
   *
   * **모든 장에 진입로가 있다** [2026-08-17 확정]. 예전에는 주문 단계 사이를 비워 두고
   * 아이가 직접 고르기를 기다렸다 — 대신 고르는 것이 원본 튜토리얼의 문제였기 때문이다.
   * 그런데 그러면 `다음` 이 아무 일도 안 하는 장이 넷이나 생겨 안내가 거기서 끊겼다.
   * 지금은 튜토리얼이 **보기 좋은 기본값**(1만원·첫 이유·첫 계획)을 눌러 끝까지 데려가고,
   * 아이는 설명을 읽은 뒤 그 자리에서 직접 바꾸면 된다.
   */
  enter?: { path: string } | { anchors: string[] };
};

/**
 * 팔 게 없을 때 대신 보여 줄 회사. 크래프톤이다.
 *
 * 여기까지 오는 것은 보유가 하나도 없을 때뿐이고, 그때는 매수까지만 보여 준다(아래
 * `tutorialSteps`). 게임 회사라 아이에게 설명하기 쉬워 골랐다.
 */
export const FALLBACK_STOCK = "259960";

/** 지갑에서 읽는 보유 한 줄. `lib/server-account.ts` 의 `Holding` 중 여기 필요한 것만. */
export type TutorialHolding = { code: string; qty: number; availableQty?: number };

/**
 * 튜토리얼이 사고팔 회사. **아이가 지금 갖고 있는 것 중 팔 수 있는 첫 종목**이다.
 *
 * 아이가 보고 있던 카드를 대신 누르던 예전 길은 `id="tut-explore-cards"` 가 카드를 감싼
 * 슬라이드에 붙어 있고 `onClick` 은 그 **안쪽** 카드에 있어 눌러도 아무 일이 없었다 —
 * 흐름이 카드에서 끊겼다. 그렇다고 한 회사로 못 박으면 그 회사가 없는 계정은 매도에서
 * 막힌다. 그래서 **지갑을 보고 정한다.**
 *
 * 갖고 있는 회사로 사고팔면 얻는 것이 하나 더 있다. 매도 2단계의 `살 때 쓴 일기` 가
 * **방금 아이가 매수 장에서 남긴 이유**를 그대로 보여 준다 — 남의 시드 기록이나
 * `기록이 없어요` 가 아니라.
 *
 * 예약에 묶인 수량은 팔 수 없으므로 `availableQty` 를 먼저 본다.
 */
export function pickTutorialStock(holdings: readonly TutorialHolding[]) {
  return holdings.find((holding) => (holding.availableQty ?? holding.qty) > 0)?.code ?? null;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: "home-goal",
    screen: "home",
    anchors: ["tut-home-goal"],
    title: "오늘 내가 얼마나 벌었나",
    what: "여기 왁뿌볼을 몇 개 살 수 있는지 나와요. 아래 숫자로 지금 얼마나 벌었는지 한눈에 볼 수 있어요.",
    term: "수익",
    concept:
      "처음 받은 돈보다 지금 가진 돈이 많으면 번 거고, 적으면 잃은 거예요. 그 차이가 수익이에요. 빨간색은 늘었다는 뜻이고 파란색은 줄었다는 뜻이에요. 갖고 있는 주식 값이 매일 바뀌니까 이 숫자도 같이 움직여요.",
    hint: "아래 모의투자를 찾아봐요",
    enter: { path: "/" },
  },
  {
    id: "nav-trade",
    screen: "home",
    anchors: ["tut-nav-trade"],
    title: "사고파는 곳으로 가기",
    what: "모의투자를 누르면 회사를 구경하고 주식을 사고팔 수 있어요. 한번 눌러 볼까요?",
    term: "모의투자",
    concept:
      "진짜 돈이 아니라 연습용 돈으로 해 보는 투자예요. 틀려도 진짜 돈이 줄지 않으니까 마음 편히 이것저것 해 봐도 돼요. 대신 값이 움직이는 건 진짜와 똑같아요.",
    hint: "모의투자를 눌러 봐요",
  },
  {
    id: "explore-chips",
    screen: "explore",
    anchors: ["tut-explore-chips"],
    title: "회사 종류 고르기",
    what: "사거나 팔고 싶은 주식의 종류를 여기서 고를 수 있어요. 맨 왼쪽은 오늘 많이 오른 회사부터 보여줘요.",
    term: "섹터",
    concept:
      "비슷한 일을 하는 회사끼리 묶은 걸 섹터라고 해요. 게임 만드는 회사는 게임 섹터, 라면 만드는 회사는 식품 섹터예요. 한 섹터가 통째로 오르거나 내릴 때가 있어서, 여러 섹터를 나눠 가지면 한쪽이 흔들려도 덜 휘청여요.",
    hint: "마음에 드는 종류를 눌러 봐요",
    enter: { anchors: ["tut-nav-trade"] },
  },
  {
    id: "explore-cards",
    screen: "explore",
    anchors: ["tut-explore-cards"],
    title: "회사 카드 보기",
    what: "주식의 지금 가격과 오늘 얼마나 오르고 내렸는지가 카드에 나와요. 카드를 위아래로 밀면 다른 회사가 나와요.",
    term: "주식과 주가",
    concept:
      "주식은 회사를 아주 잘게 나눈 조각이에요. 한 조각을 사면 나도 그 회사의 주인 중 한 명이 돼요. 그 조각 하나의 값이 주가예요. 빨간색은 어제보다 오른 거고, 파란색은 내린 거예요.",
    hint: "다음을 누르면 회사를 자세히 봐요",
  },
  {
    id: "detail-chart",
    screen: "stock",
    stage: "detail",
    anchors: ["tut-detail-chart"],
    title: "값이 어떻게 움직였나",
    what: "차트를 누르면 이 주식의 가격이 그동안 어떻게 움직였는지 한눈에 볼 수 있어요.",
    term: "차트",
    concept:
      "값이 오르내린 길을 선으로 이어 그린 그림이에요. 선이 위로 가면 그동안 오른 거고 아래로 가면 내린 거예요. 지나온 길은 알려 주지만 앞으로 어디로 갈지는 알려 주지 않아요.",
    hint: "차트 자세히 보기를 눌러도 돼요",
    // 어느 카드를 보고 있든 튜토리얼이 정한 회사로 들어간다 — `pickTutorialStock` 참고.
    enter: { path: "/stock/:code" },
  },
  {
    id: "detail-about",
    screen: "stock",
    stage: "detail",
    anchors: ["tut-detail-about"],
    title: "이 회사는 뭘 하나요",
    what: "이 회사가 어떤 일을 하는 곳인지 알려줘요.",
    term: "회사와 주식",
    concept:
      "주식을 산다는 건 그 회사의 아주 작은 주인이 된다는 뜻이에요. 그래서 무슨 일을 하는 회사인지 아는 게 먼저예요. 내가 무슨 일을 하는지도 모르는 곳의 주인이 되는 건 이상하잖아요.",
    hint: "아래 소식도 읽어 봐요",
  },
  {
    id: "detail-news",
    screen: "stock",
    stage: "detail",
    anchors: ["tut-detail-news"],
    title: "요즘 무슨 일이 있었나",
    what: "최근에 이 회사에 이런 일이 있었어요. 어려운 말은 쉬운 말로 풀어서 알려줘요.",
    term: "뉴스와 주가",
    concept:
      "회사에 좋은 일이 생기면 사려는 사람이 늘고, 걱정되는 일이 생기면 팔려는 사람이 늘어요. 그래서 뉴스가 나오면 값이 움직이곤 해요. 다만 뉴스 하나만 보고 다음에 오를지 내릴지는 아무도 알 수 없어요.",
    hint: "뉴스 자세히 보기를 눌러도 돼요",
  },
  {
    id: "detail-buy",
    screen: "stock",
    stage: "detail",
    anchors: ["tut-detail-buy"],
    title: "사러 가기",
    what: "이 회사가 마음에 들면 주문하기를 눌러 볼까요?",
    term: "매수",
    concept:
      "주식을 사는 걸 매수라고 해요. 가게에서 물건 사는 거랑 비슷한데 다른 게 하나 있어요. 값이 계속 바뀌어서, 내가 산 뒤에 오를 수도 내릴 수도 있다는 거예요. 그래서 사기 전에 왜 사는지 한 번 생각해 보면 좋아요.",
    hint: "주문하기를 눌러 봐요",
  },
  {
    id: "buy-tabs",
    screen: "order",
    stage: "order-1",
    side: "buy",
    anchors: ["tut-order-tabs"],
    title: "살래 · 팔래 · 예약",
    what: "여기서 사기와 팔기를 오갈 수 있어요. 예약을 누르면 기다리는 주문도 볼 수 있어요.",
    term: "주문",
    concept:
      "사겠다 또는 팔겠다고 내는 신청이 주문이에요. 주문을 넣었다고 바로 거래가 되는 건 아니에요. 사겠다는 사람과 팔겠다는 사람의 값이 맞아야 그때 거래가 이뤄져요.",
    hint: "얼마나 살지 골라 봐요",
    enter: { anchors: ["tut-detail-buy"] },
  },
  {
    id: "buy-amount",
    screen: "order",
    stage: "order-1",
    side: "buy",
    anchors: ["tut-order-amount"],
    title: "얼마나 살까",
    what: "사고 싶은 주식을 만원어치씩 살 수도 있고, 몇 주 살지 개수로 고를 수도 있어요.",
    term: "분산",
    concept:
      "가진 돈을 한 회사에 몽땅 넣으면 그 회사가 흔들릴 때 내 돈도 전부 같이 흔들려요. 여러 곳에 나눠 담으면 한 곳이 내려가도 다른 곳이 버텨 줘요. 이걸 분산이라고 해요.",
    hint: "금액이나 주 수를 골라 봐요",
  },
  {
    id: "buy-price",
    screen: "order",
    stage: "order-1",
    side: "buy",
    anchors: ["tut-order-price"],
    title: "어떤 값에 살까",
    what: "지금 가격으로 바로 살 수도 있고, 내가 정한 가격이 될 때까지 기다렸다 살 수도 있어요.",
    term: "예약 주문",
    concept:
      "지금 값이 마음에 안 들 때, 얼마가 되면 사겠다고 미리 적어 두는 거예요. 그 값이 오지 않으면 주문은 그냥 기다리기만 해요. 기다리는 동안 그 돈은 다른 데 못 쓰니까, 오래 걸어 두면 답답할 수 있어요.",
    hint: "다 골랐으면 다음을 눌러요",
  },
  {
    id: "buy-reason",
    screen: "order",
    stage: "order-2",
    side: "buy",
    anchors: ["tut-order-reason"],
    title: "왜 사는지 남기기",
    what: "왜 이 회사가 좋아 보였는지, 언제까지 갖고 있을지 고르고 하고 싶은 말도 남길 수 있어요.",
    term: "투자 이유",
    concept:
      "이유를 남겨 두면 나중에 다시 볼 수 있어요. 잘됐을 때도 아쉬웠을 때도 “그때 나는 이렇게 생각했구나” 하고 알 수 있거든요. 언제까지 가질지 미리 정해 두면 값이 흔들릴 때 덜 놀라요.",
    hint: "이유와 목표를 골라 봐요",
    // 금액을 골라야 `다음` 이 켜진다. 1만원을 눌러 두고 넘긴다 — 아이는 여기서 바꿀 수 있다.
    enter: { anchors: ["tut-order-amount-preset", "tut-order-next"] },
  },
  {
    id: "buy-done",
    screen: "order",
    stage: "order-3",
    side: "buy",
    anchors: ["tut-order-done"],
    title: "샀어요!",
    // 팔 게 없으면 여기가 마지막 장이다. "이제 파는 단계도 볼까요" 를 여기 두면 그때
    // 어색해지므로 그 말은 매도 첫 장이 한다.
    what: "짠, 사기로 결정했어요! 얼마에 몇 개를 샀는지 여기서 볼 수 있어요.",
    term: "체결",
    concept:
      "주문이 실제 거래로 바뀌는 걸 체결이라고 해요. 장이 열려 있을 때 지금 값으로 사면 바로 체결되고, 장이 닫혔거나 값을 정해 뒀으면 그 조건이 될 때까지 기다렸다 체결돼요.",
    hint: "다음을 누르면 파는 화면으로 가요",
    // 이유와 계획을 고른 뒤라야 `주문하기` 가 켜진다. 첫 칸을 눌러 두고 완료 화면으로 넘긴다.
    enter: { anchors: ["tut-order-reason-first", "tut-order-plan-first", "tut-order-next"] },
  },
  {
    id: "sell-amount",
    screen: "order",
    stage: "order-1",
    side: "sell",
    anchors: ["tut-order-amount"],
    title: "얼마나 팔까",
    what: "이번엔 파는 차례예요. 갖고 있는 것 중 얼마나 팔 건지 정할 수 있어요. 전부 팔 수도 있고 절반만 팔 수도 있어요.",
    term: "매도",
    concept:
      "주식을 파는 걸 매도라고 해요. 팔면 그만큼 다시 돈으로 바뀌어서 지갑에 들어와요. 한꺼번에 다 팔지 않고 나눠서 파는 것도 할 수 있어요.",
    hint: "얼마나 팔지 골라 봐요",
    // 방금 본 그 회사를 그대로 팔러 간다. 종목 코드는 화면만 아니까 자리에서 받아 채운다.
    enter: { path: "/sell/:code" },
  },
  {
    id: "sell-price",
    screen: "order",
    stage: "order-1",
    side: "sell",
    anchors: ["tut-order-price"],
    title: "어떤 값에 팔까",
    what: "지금 가격에 바로 팔 수도 있고, 팔고 싶은 가격을 정해 두고 기다릴 수도 있어요.",
    term: "목표 가격",
    concept:
      "얼마가 되면 팔겠다고 미리 정해 두는 값이에요. 미리 정해 두면 값이 갑자기 움직여도 그때그때 마음 가는 대로 정하지 않게 돼요. 대신 그 값이 오지 않으면 계속 기다리기만 해요.",
    hint: "다 골랐으면 다음을 눌러요",
  },
  {
    id: "sell-recall",
    screen: "order",
    stage: "order-2",
    side: "sell",
    anchors: ["tut-sell-recall"],
    title: "살 때 쓴 일기",
    what: "살 때 적어둔 일기를 여기서 다시 볼 수 있어요. 그때 나는 어떤 생각이었을까요?",
    term: "계획 지키기",
    concept:
      "살 때 “언제까지 갖고 있겠다”고 정한 것과 지금 파는 것이 같은지 견줘 보는 자리예요. 계획대로 팔았는지 마음이 바뀌어 팔았는지는 둘 다 괜찮아요. 다만 어느 쪽이었는지 알아 두면 다음에 더 나은 결정을 할 수 있어요.",
    hint: "그때 마음과 지금 마음을 견줘 봐요",
    // 팔 수량은 기본이 전부라 그대로 넘어간다.
    enter: { anchors: ["tut-order-next"] },
  },
  {
    id: "sell-reason",
    screen: "order",
    stage: "order-2",
    side: "sell",
    anchors: ["tut-sell-reason"],
    title: "왜 파는지 남기기",
    what: "왜 팔고 싶은지, 어떤 생각이 들었는지 적어 봐요.",
    term: "매도 이유",
    concept:
      "파는 이유도 사는 이유만큼 중요해요. 값이 올라서 판 건지, 무서워서 판 건지, 다른 걸 사려고 판 건지 남겨 두면 나중에 내가 어떤 때 흔들리는 사람인지 알게 돼요.",
    hint: "다 고르면 팔기를 눌러요",
  },
  {
    id: "sell-done",
    screen: "order",
    stage: "order-3",
    side: "sell",
    anchors: ["tut-order-done"],
    title: "팔았어요!",
    what: "팔기로 결정했어요! 얼마에 몇 개를 팔았는지 여기서 볼 수 있어요.",
    term: "실현 수익",
    concept:
      "팔기 전까지 오르내리던 숫자는 아직 정해진 게 아니에요. 팔아야 그때 값으로 정해지고, 그걸 실현 수익이라고 해요. 사고판 기록은 아카이브에 모여서 내가 어떤 투자자인지 보여줘요.",
    hint: "여기까지예요. 이제 직접 해 봐요!",
    // 계획을 지켰으면 변경 이유 칸이 아예 없다. 없는 앵커는 조용히 건너뛴다.
    enter: { anchors: ["tut-sell-reason-first", "tut-sell-change-first", "tut-order-next"] },
  },
];

export type TutorialPlace = {
  screen: ScreenRoute["screen"];
  stage?: TutorialStage;
  side?: "buy" | "sell";
};

/**
 * 이번 튜토리얼이 보여 줄 장.
 *
 * **팔 게 없으면 파는 과정을 빼고 매수까지만 보여 준다.** 매도 화면은 보유가 없으면
 * `판매할 주식이 없어요` 로 막히므로, 데려가 놓고 막히느니 사는 것까지만 끝내는 편이 낫다.
 * 시드 보유가 있는 계정은 언제나 전부 보게 된다.
 *
 * 예전의 길이 선택(5·8·13)과 다르다. 그건 고를 화면이 없어 아무도 못 고르던 죽은
 * 갈래였고, 이건 지갑이 정하는 갈래 하나다.
 */
export function tutorialSteps(canSell: boolean) {
  return canSell ? TUTORIAL_STEPS : TUTORIAL_STEPS.filter((step) => step.side !== "sell");
}

/** 장이 `side` 를 적었으면 그 방향에서만 이 장이다. 안 적었으면 어느 쪽이든 맞다. */
function sideMatches(step: TutorialStep, at: TutorialPlace) {
  return step.side === undefined || step.side === at.side;
}

/**
 * 지금 화면에 해당하는 장을 찾는다. 없으면 `-1`.
 *
 * 자리를 정확히 아는 장이 먼저다. 그다음이 화면만 아는 장이고, 둘 다 없으면 그 화면의
 * 첫 장으로 물러선다 — 차트처럼 문안이 따로 없는 자리에서도 그 화면 설명은 띄워야 한다.
 */
export function stepIndexAt(steps: readonly TutorialStep[], at: TutorialPlace) {
  const exact = steps.findIndex(
    (step) => step.screen === at.screen && step.stage === at.stage && sideMatches(step, at),
  );
  if (exact >= 0) return exact;

  const anyStage = steps.findIndex(
    (step) => step.screen === at.screen && step.stage === undefined && sideMatches(step, at),
  );
  if (anyStage >= 0) return anyStage;

  return steps.findIndex((step) => step.screen === at.screen && sideMatches(step, at));
}

/** 다음 장. 끝이면 `-1`. */
export function nextStepIndex(steps: readonly TutorialStep[], index: number) {
  return index >= 0 && index + 1 < steps.length ? index + 1 : -1;
}

/**
 * 두 장이 같은 자리인지.
 *
 * 같은 자리면 `다음` 이 그 자리에서 바로 넘어간다. 다른 자리면 넘어갈 수 없으므로
 * 미니바로 접고 힌트만 남긴다 — 대신 눌러 주지 않는다. 원본의 `tryMove` 는 잠긴 버튼을
 * 풀려고 선택지를 하나씩 눌러 봤는데, 그건 아이 대신 투자 결정을 고르는 짓이다.
 */
export function isSamePlace(a: TutorialStep, b: TutorialStep) {
  return a.screen === b.screen && a.stage === b.stage && a.side === b.side;
}

/** `enter.path` 의 `:code` 를 이번 튜토리얼의 종목으로 바꾼다. 모르면 빈 문자열이라 404 다. */
export function enterPath(path: string, code: string | null) {
  return path.replace(":code", code ?? "");
}

/**
 * 이전 장으로 **되돌아갈** 주소. 되돌릴 수 없으면 `null` 이고 `이전` 버튼이 흐려진다.
 *
 * 앞으로 갈 때 쓰는 `enter` 를 그대로 되감을 수는 없다. `enter` 는 **누르는 순서**라
 * 되돌리려고 다시 실행하면 앞선 입력이나 완료 화면이 반복된다. 그래서 뒤로 가는 길은 따로 둔다 —
 * 화면 주소로만 가고, 아무것도 누르지 않는다.
 *
 * **주문 화면으로는 되돌아가지 않는다.** 단계 입력을 되감으면 완료 화면과 설명이 어긋난다.
 * 주문 화면 안에서 자리가 같은 장끼리는 주소를 옮길 일 없이 설명만 되돌리므로
 * 이 함수를 타지 않는다.
 */
export function backPath(step: TutorialStep, code: string | null) {
  if (step.screen === "home") return "/";
  if (step.screen === "explore") return "/explore";
  if (step.screen === "stock" && code) return `/stock/${code}`;
  return null;
}
