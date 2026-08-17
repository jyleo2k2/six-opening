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
 * 3. **문안을 지금 화면에 맞춘다.** 탐색 카드는 세로로 넘기고(원본은 "옆으로"),
 *    버튼 이름은 자리마다 다음·주문하기·팔기로 갈린다.
 *
 * 길이는 5·8·13 중에서 고른다. `from` 이 그 장이 처음 들어오는 길이라 5 ⊂ 8 ⊂ 13 이고,
 * **8 장은 화면마다 정확히 한 장**이다 — 나중에 "화면당 한 장을 저절로 띄우는" 방식으로
 * 갈아타도 문안을 다시 쓸 일이 없다.
 */

export type TutorialLength = 5 | 8 | 13;

export const TUTORIAL_LENGTHS = [5, 8, 13] as const satisfies readonly TutorialLength[];

/** 기본 길이. 화면마다 한 장씩이다. */
export const TUTORIAL_LENGTH = 8 satisfies TutorialLength;

/**
 * 화면 안에서만 바뀌는 자리.
 *
 * 주문 1/2/3 단계와 상세→뉴스는 주소가 안 바뀌어(`useState`) 밖에서는 안 보인다.
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
   * 장이 아니라 자리에 매어 둔 이유는 길이(5·8·13)에 따라 다음 장이 달라지기 때문이다 —
   * 8장에서는 주문 다음이 계좌지만 13장에서는 예약이다. 목적지가 제 진입로를 들고 있으면
   * 어느 길이에서도 맞는다.
   *
   * - `path` — 주소로 바로 간다.
   * - `anchor` — 그 자리의 **이동 버튼**을 대신 누른다. 종목 코드처럼 화면만 아는 값이
   *   주소에 필요할 때 쓴다. 누르는 것은 이동 버튼뿐이고 금액·이유 같은 **고르는 자리는
   *   건드리지 않는다** — 그건 아이 대신 투자 결정을 고르는 짓이다.
   *
   * 없으면 데려가지 않는다. 아이가 직접 골라야 넘어가는 자리(주문 2단계)가 그렇다.
   */
  enter?: { path: string } | { anchor: string };
  /** 이 장이 처음 들어오는 길이. */
  from: TutorialLength;
};

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: "home",
    screen: "home",
    anchors: ["tut-home-total"],
    title: "내 돈이 얼마인지",
    what: "맨 위 숫자가 지금 내가 가진 전부예요. 남은 현금이랑 사 둔 주식을 합한 값이에요.",
    term: "총자산",
    concept:
      "지갑에 남은 현금과 지금 갖고 있는 주식 값을 더한 게 총자산이에요. 주식 값은 매일 바뀌니까 이 숫자도 같이 움직여요. 빨간색은 어제보다 올랐다는 뜻이고, 파란색은 내렸다는 뜻이에요.",
    hint: "아래 모의투자를 누르면 회사를 구경할 수 있어요",
    enter: { path: "/" },
    from: 5,
  },
  {
    id: "explore-chips",
    screen: "explore",
    anchors: ["tut-explore-chips"],
    title: "회사 종류 고르기",
    what: "여기서 회사 종류를 골라요. 맨 왼쪽은 오늘 많이 오른 회사부터 보여줘요.",
    term: "섹터",
    concept:
      "비슷한 일을 하는 회사끼리 묶은 걸 섹터라고 해요. 게임 만드는 회사는 게임 섹터, 라면 만드는 회사는 식품 섹터예요. 한 섹터가 통째로 오르거나 내릴 때가 있어서, 여러 섹터를 나눠 가지면 한쪽이 흔들려도 덜 휘청여요.",
    hint: "마음에 드는 종류를 눌러 봐요",
    enter: { path: "/explore" },
    from: 13,
  },
  {
    id: "explore-cards",
    screen: "explore",
    anchors: ["tut-explore-cards"],
    title: "회사 카드 넘겨보기",
    what: "카드를 위아래로 밀면 다른 회사가 나와요. 카드에 오늘 값이랑 얼마나 움직였는지가 적혀 있어요.",
    term: "주식과 주가",
    concept:
      "주식은 회사를 아주 잘게 나눈 조각이에요. 한 조각을 사면 나도 그 회사의 주인 중 한 명이 돼요. 그 조각 하나의 값이 주가예요. 빨간색은 어제보다 오른 거고, 파란색은 내린 거예요.",
    hint: "카드를 눌러서 회사를 자세히 봐요",
    enter: { path: "/explore" },
    from: 5,
  },
  {
    id: "detail",
    screen: "stock",
    stage: "detail",
    anchors: ["tut-detail-chart", "tut-detail-buy"],
    title: "회사 자세히 보기",
    what: "그래프로 값이 그동안 어떻게 움직였는지 볼 수 있어요. 사러 가려면 아래 주문하기를 눌러요.",
    term: "매수",
    concept:
      "주식을 사는 걸 매수라고 해요. 가게에서 물건 사는 거랑 비슷한데 다른 게 하나 있어요. 값이 계속 바뀌어서, 내가 산 뒤에 오를 수도 내릴 수도 있다는 거예요. 그래서 사기 전에 왜 사는지 한 번 생각해 보면 좋아요.",
    hint: "주문하기를 눌러 봐요",
    // 종목 코드는 화면만 안다. 지금 보고 있는 카드를 눌러 그 종목으로 들어간다.
    enter: { anchor: "tut-explore-cards" },
    from: 8,
  },
  {
    id: "news",
    screen: "stock",
    stage: "news",
    anchors: ["tut-news-easy"],
    title: "어려운 말 풀어 보기",
    what: "이 회사에 무슨 일이 있었는지 3줄로 알려줘요. 기사에 나온 어려운 말은 아래에 쉬운 말로 풀어 놨어요.",
    term: "뉴스와 주가",
    concept:
      "회사에 좋은 일이 생기면 사려는 사람이 늘고, 걱정되는 일이 생기면 팔려는 사람이 늘어요. 그래서 뉴스가 나오면 값이 움직이곤 해요. 다만 뉴스 하나만 보고 다음에 오를지 내릴지는 아무도 알 수 없어요.",
    hint: "이 말은 무슨 뜻이야 칸을 읽어 봐요",
    enter: { anchor: "tut-detail-news" },
    from: 8,
  },
  {
    id: "order-amount",
    screen: "order",
    stage: "order-1",
    anchors: ["tut-order-amount", "tut-order-next"],
    title: "얼마나 살까",
    what: "쓸 금액을 고르거나 몇 주 살지 골라요. 다 고르면 아래 다음을 눌러요.",
    term: "분산",
    concept:
      "가진 돈을 한 회사에 몽땅 넣으면 그 회사가 흔들릴 때 내 돈도 전부 같이 흔들려요. 여러 곳에 나눠 담으면 한 곳이 내려가도 다른 곳이 버텨 줘요. 이걸 분산이라고 해요.",
    hint: "금액이나 주 수를 고르고 다음을 눌러요",
    enter: { anchor: "tut-detail-buy" },
    from: 5,
  },
  {
    // 예약은 1단계 안의 갈래라 `order-amount` 와 같은 자리다. 바로 뒤에 두어야
    // `다음` 이 그 자리에서 이어진다.
    id: "order-reserve",
    screen: "order",
    stage: "order-1",
    anchors: ["tut-order-reserve"],
    title: "값을 정해 두고 기다리기",
    what: "예약을 고르면 내가 정한 값이 될 때까지 기다렸다가 사요. 기다리는 동안 그 돈은 잠깐 맡아 둬요.",
    term: "예약 주문",
    concept:
      "지금 값이 마음에 안 들 때, 얼마가 되면 사겠다고 미리 적어 두는 거예요. 그 값이 오지 않으면 주문은 그냥 기다리기만 해요. 기다리는 동안 그 돈은 다른 데 못 쓰니까, 오래 걸어 두면 답답할 수 있어요.",
    hint: "지금 값으로 바로 사려면 그냥 다음을 눌러요",
    from: 13,
  },
  {
    id: "order-reason",
    screen: "order",
    stage: "order-2",
    anchors: ["tut-order-reason", "tut-order-next"],
    title: "왜 사는지, 언제까지 가질지",
    what: "왜 사고 싶은지 고르고, 얼마나 오래 갖고 있을지도 골라요. 하고 싶은 말은 아래에 한 줄 남겨도 돼요.",
    term: "투자 이유",
    concept:
      "이유를 남겨 두면 나중에 다시 볼 수 있어요. 잘됐을 때도 아쉬웠을 때도 “그때 나는 이렇게 생각했구나” 하고 알 수 있거든요. 언제까지 가질지 미리 정해 두면 값이 흔들릴 때 덜 놀라요.",
    hint: "다 고르면 주문하기를 눌러요",
    from: 13,
  },
  {
    id: "portfolio",
    screen: "portfolio",
    anchors: ["tut-portfolio-holdings"],
    title: "내가 가진 것 보기",
    what: "지금 갖고 있는 회사들이 여기 모여 있어요. 얼마에 샀는지, 지금은 얼마인지 한눈에 볼 수 있어요.",
    term: "보유 종목",
    concept:
      "내가 지금 갖고 있는 회사들을 보유 종목이라고 해요. 산 값보다 지금 값이 높으면 빨간색, 낮으면 파란색이에요. 팔기 전까지는 아직 정해진 게 아니에요 — 숫자는 계속 움직이거든요.",
    hint: "종목을 누르면 자세히 볼 수 있어요",
    enter: { path: "/portfolio" },
    from: 5,
  },
  {
    id: "portfolio-pending",
    screen: "portfolio",
    anchors: ["tut-portfolio-pending"],
    title: "기다리는 주문 보기",
    what: "예약해 둔 주문은 여기서 기다려요. 마음이 바뀌면 취소할 수 있어요.",
    term: "미체결",
    concept:
      "아직 거래가 이뤄지지 않은 주문을 미체결이라고 해요. 사겠다는 사람과 팔겠다는 사람의 값이 맞아야 거래가 되거든요. 값이 맞으면 그때 체결되고, 그제야 주식이 진짜 내 것이 돼요.",
    hint: "취소를 누르면 맡아 둔 돈을 돌려줘요",
    enter: { path: "/portfolio" },
    from: 13,
  },
  {
    id: "portfolio-sell",
    screen: "portfolio",
    anchors: ["tut-portfolio-sell"],
    title: "팔러 가기",
    what: "갖고 있는 걸 팔 수도 있어요. 종목 카드 아래 팔러 가기를 누르면 돼요.",
    term: "매도",
    concept:
      "주식을 파는 걸 매도라고 해요. 팔면 그만큼 다시 돈으로 바뀌어서 지갑에 들어와요. 한꺼번에 다 팔지 않고 나눠서 파는 것도 할 수 있어요.",
    hint: "팔러 가기를 누르면 얼마나 팔지 고를 수 있어요",
    enter: { path: "/portfolio" },
    from: 13,
  },
  {
    id: "ranking",
    screen: "ranking",
    anchors: ["tut-ranking"],
    title: "다른 사람과 견줘 보기",
    what: "같이 하는 사람들이 이번 시즌에 어떻게 하고 있는지 볼 수 있어요.",
    term: "수익률",
    concept:
      "처음 가진 돈에서 얼마나 늘거나 줄었는지를 퍼센트로 나타낸 게 수익률이에요. 금액이 아니라 비율이라서 시작한 돈이 서로 달라도 견줄 수 있어요. 순위는 지금 이 순간의 모습이라 매일 바뀌어요.",
    hint: "아카이브에서 내 기록을 볼 수 있어요",
    enter: { path: "/ranking" },
    from: 8,
  },
  {
    id: "archive",
    screen: "archive",
    anchors: ["tut-archive-family"],
    title: "가족과 견줘 보기",
    what: "사고팔았던 게 전부 여기 쌓여요. 가족이 어떻게 했는지도 같이 볼 수 있어요.",
    term: "기록",
    concept:
      "언제 사서 언제 팔았는지, 그때 무슨 생각이었는지가 남아요. 가족끼리 서로 어떻게 골랐는지 견줘 보면 나는 어떤 쪽인지 알게 돼요. 이게 이 앱에서 제일 중요한 부분이에요.",
    hint: "우리 가족 수익을 누르면 가족 피드가 나와요",
    enter: { path: "/archive" },
    from: 5,
  },
];

/** 고른 길이에 들어가는 장만. 순서는 그대로다. */
export function tutorialSteps(length: TutorialLength = TUTORIAL_LENGTH) {
  return TUTORIAL_STEPS.filter((step) => step.from <= length);
}

export type TutorialPlace = {
  screen: ScreenRoute["screen"];
  stage?: TutorialStage;
};

/**
 * 지금 화면에 해당하는 장을 찾는다. 없으면 `-1`.
 *
 * 자리를 정확히 아는 장이 먼저다. 그다음이 화면만 아는 장이고, 둘 다 없으면 그 화면의
 * 첫 장으로 물러선다 — 차트처럼 문안이 따로 없는 자리에서도 그 화면 설명은 띄워야 한다.
 */
export function stepIndexAt(steps: readonly TutorialStep[], at: TutorialPlace) {
  const exact = steps.findIndex(
    (step) => step.screen === at.screen && step.stage === at.stage,
  );
  if (exact >= 0) return exact;

  const anyStage = steps.findIndex(
    (step) => step.screen === at.screen && step.stage === undefined,
  );
  if (anyStage >= 0) return anyStage;

  return steps.findIndex((step) => step.screen === at.screen);
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
  return a.screen === b.screen && a.stage === b.stage;
}
