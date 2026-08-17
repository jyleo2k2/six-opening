import assert from "node:assert/strict";
import {
  familySummary,
  feedCards,
  FEED_PER_MEMBER,
  returnSummary,
  runners,
  type FamilyTrade,
} from "./archive-feed";
import {
  axesFromCard,
  buildTypePicks,
  familyMembers,
  myProfile,
  NEUTRAL_SCORES,
  PENDING_TYPE,
  resolveType,
  typeKeyOf,
  weekCards,
  type FamilyRow,
} from "./archive-profile-view";
import { lastSeasonReport, seasonTypeOf } from "./archive-season";

// ── 성향: 원본은 season-cards 누적 카드 하나다 ──────────────────────────────
const card = {
  scores: { focus: 8, diversification: 3, accuracy: 5, intuition: 2, evidence: 9 },
  character: "sniper",
  level: 3,
  samples: { buys: 4, sells: 1 },
};
assert.deepEqual(axesFromCard(card), [8, 3, 5, 2, 9]);

const logged = myProfile({ cumulative: card });
assert.deepEqual(logged.scores, [8, 3, 5, 2, 9]);
assert.equal(logged.scaleMax, 10);
assert.equal(logged.level, 3);
assert.equal(logged.characterKey, "sniper");
assert.equal(logged.sampleCount, 5);

// 누적 카드가 없으면(비로그인·조회 실패) 축은 중립 5, 유형은 비운다.
// 로컬 기록으로 다시 계산하면 그 값이 먼저 떠서 캐릭터가 바뀌어 보인다.
const pending = myProfile(null);
assert.deepEqual(pending.scores, NEUTRAL_SCORES);
assert.deepEqual(pending.scores, [5, 5, 5, 5, 5]);
assert.equal(pending.scaleMax, 10);
assert.equal(pending.level, null);
assert.equal(pending.characterKey, null);
assert.equal(pending.sampleCount, 0);

// 엔진이 표본 부족·동점대로 판정을 보류하면 레벨도 없다. 2로 채우지 않는다 —
// 채우면 실제로 판정된 LV2 와 화면에서 구별되지 않는다.
const undecided = myProfile({ cumulative: { ...card, character: null, level: null } });
assert.deepEqual(undecided.scores, [8, 3, 5, 2, 9]);
assert.equal(undecided.characterKey, null);
assert.equal(undecided.level, null);

// 서버가 예전 이름으로 준 캐릭터는 지금 이름에 맞춘다. 모르는 값은 null.
assert.equal(typeKeyOf("challenger"), "fighter");
assert.equal(typeKeyOf("sniper"), "sniper");
assert.equal(typeKeyOf("없는유형"), null);
assert.equal(typeKeyOf(null), null);

// resolveType 은 판정하지 않고 펴기만 한다.
const explorer = resolveType("explorer", 2);
assert.equal(explorer.key, "explorer");
assert.equal(explorer.title, "탐험가 LV2");
assert.equal(explorer.ink, "#1B3F35");
assert.equal(explorer.pending, false);

// 유형이 없으면 관찰 중 카드. 축 점수로 유형을 되짚지 않는다.
const pendingType = resolveType(null, null);
assert.equal(pendingType.key, null);
assert.equal(pendingType.title, "관찰 중");
assert.equal(pendingType.pending, true);
assert.deepEqual(pendingType, PENDING_TYPE);

// 유형은 정해졌는데 레벨이 없으면 이름만 적는다.
assert.equal(resolveType("sniper", null).title, "저격수");

// ── 카드 모아보기: 서버가 채점한 주 + 이번 주, 오래된 순 ────────────────────
const now = new Date("2026-08-17T09:00:00+09:00").getTime(); // 월요일
const myType = resolveType("sniper", 3);
const cards = weekCards(
  {
    cumulative: card,
    weeks: [
      { weekStart: "2026-08-03", count: 2, card },
      { weekStart: "2026-08-10", count: 1, card },
    ],
  },
  logged,
  myType,
  now,
);
// 첫 월요일부터 주차를 센다: 8/3~8/9는 1주차, 현재 8/17~8/23은 3주차다.
assert.equal(cards.length, 3);
assert.deepEqual(cards.map((item) => item.week), ["8월 1주차", "8월 2주차", "8월 3주차"]);
assert.deepEqual(cards.map((item) => item.date), ["8/3 – 8/9", "8/10 – 8/16", "8/17 – 8/23"]);
// 이번 주 카드는 성향 탭과 같은 유형이어야 한다 — 한 화면에서 갈리면 안 된다.
assert.equal(cards[2].title, myType.title);
assert.deepEqual(cards[2].scores, logged.scores);
// 지난 주는 서버가 채점한 값(0~10)이다. 로컬 재계산 카드는 이제 섞이지 않는다.
assert.equal(cards[0].scaleMax, 10);
assert.equal(cards[0].date, "8/3 – 8/9");

// 로컬에만 있는 주는 더 이상 카드가 되지 않는다 — 서버 주차 + 이번 주뿐이다.
const empty = weekCards(null, pending, pendingType, now);
assert.equal(empty.length, 1);
assert.equal(empty[0].week, "8월 3주차");
assert.equal(empty[0].title, "관찰 중");
assert.deepEqual(empty[0].scores, [5, 5, 5, 5, 5]);
assert.match(empty[0].desc, /아직 산 게 없어요/u);

// ── 성향별 종목 세 개 ─────────────────────────────────────────────────────
// 유니버스가 아직 안 실린 첫 프레임: 이름은 표의 대체 이름, 시세는 0 이다.
const cold = buildTypePicks("sniper", null, {});
assert.deepEqual(cold.map((p) => p.code), ["005930", "000660", "066570"]);
assert.deepEqual(cold.map((p) => p.name), ["삼성전자", "SK하이닉스", "LG전자"]);
assert.equal(cold[0].logo, "");

// 이름·로고·시세의 원본은 유니버스와 5초 시세다 — 표에는 코드와 업종 표기만 있다.
const universe = {
  sectors: [],
  stocks: [{ code: "005930", name: "삼성전자", sector: "semi", desc: "", price: 100000, change: 1 }],
  logos: { "005930": "assets/logos/005930.png" },
};
const picks = buildTypePicks("sniper", universe, {
  "005930": { price: 71800, rate: 1.27 },
  "000660": { price: 198500, rate: -2.1 },
});
assert.equal(picks[0].logo, "/ui/assets/logos/005930.png");
assert.equal(picks[0].priceText, "71,800원");
// 등락률만으로 되짚은 원화 변동폭. 탐색 카드와 같은 식이라 두 화면이 어긋나지 않는다.
assert.equal(picks[0].changeText, "+900 (+1.3%)");
assert.equal(picks[0].changeColor, "#E8322E");
assert.equal(picks[1].changeText, "−4,258 (−2.1%)");
assert.equal(picks[1].changeColor, "#1668DC");
// 누르면 주문 화면으로 간다. 주소를 문자열로 짓지 않고 screen-route 가 만든다.
assert.equal(picks[0].path, "/buy/005930");
// 유니버스에 없는 코드도 표의 이름과 0 원으로 그린다 — 줄이 사라지지는 않는다.
assert.equal(picks[2].name, "LG전자");
assert.equal(picks[2].priceText, "0원");

// 성향마다 세 개씩, 겹치는 종목은 없다.
const all = (["sniper", "strategist", "fighter", "explorer"] as const).flatMap((key) =>
  buildTypePicks(key, null, {}).map((p) => p.code),
);
assert.equal(all.length, 12);
assert.equal(new Set(all).size, 12);

// 유형이 아직 없는 주(`관찰 중`)에는 종목을 지어내지 않는다.
assert.deepEqual(buildTypePicks(null, universe, {}), []);

// ── 가족 비교 ────────────────────────────────────────────────────────────
const members: FamilyRow[] = [
  { id: 1, name: "김찬영", role: "child", returnRate: 12.5, behavior: { scores: { focus: 7, diversification: 4, accuracy: 6, intuition: 3, evidence: 8 }, samples: { buys: 3 }, character: "sniper", level: 2 } },
  { id: 2, name: "찬영엄마", role: "parent", returnRate: -4.2, behavior: { samples: {}, character: null } },
  { id: 3, name: "찬영아빠", role: "parent", returnRate: null, behavior: null },
];
const fam = familyMembers(members);
assert.deepEqual(fam.map((f) => f.has), [true, false, false]);
assert.equal(fam[0].title, "저격수 LV2");
assert.match(fam[1].desc, /아직 체결된 거래가 없어요/u);
// 점수를 못 받은 축은 중립 5 — 0 으로 두면 안 담은 축이 최악처럼 보인다.
assert.deepEqual(fam[1].scores, [5, 5, 5, 5, 5]);
// 얼굴은 역할과 이름으로 고른다.
assert.match(fam[0].face, /face-me\.jpg$/u);
assert.match(fam[2].face, /face-dad\.jpg$/u);

// ── 달리기 트랙 ──────────────────────────────────────────────────────────
const lanes = runners(members);
assert.equal(lanes.length, 3);
// 아직 산 게 없는 사람(returnRate: null)은 출발선에 선다. Number(null)===0 함정.
assert.equal(lanes[2].has, false);
assert.equal(lanes[2].at, 38);
assert.equal(lanes[2].pctText, "아직");
// 등수는 산 적 있는 사람끼리만 매긴다. 안 산 사람의 0% 를 같이 세면 마이너스인 사람보다
// 앞서서, 출발선에 서 있는데 2등이라고 적힌다.
assert.deepEqual(lanes.map((l) => l.rank), [1, 2, null]);
// 플러스는 오른쪽, 마이너스는 왼쪽을 보고 선다.
assert.ok(lanes[0].at > 38);
assert.equal(lanes[0].minus, false);
assert.ok(lanes[1].at < 38);
assert.equal(lanes[1].minus, true);
assert.equal(lanes[1].pctText, "−4.2%");
// 트랙 밖으로는 못 나간다 — 오른쪽 끝 결승선 체크무늬 아래로 깔리면 안 된다.
const extreme = runners([{ id: 9, name: "x", role: "child", returnRate: 9999 }]);
assert.ok(extreme[0].at <= 76);
assert.ok(runners([{ id: 9, name: "x", role: "child", returnRate: -9999 }])[0].at >= 26);

// ── 피드 ────────────────────────────────────────────────────────────────
const trades: FamilyTrade[] = [
  {
    id: "t1", userId: 1, side: "buy", symbol: "005930", stockName: "삼성전자",
    tradedAt: "2026-08-14T02:00:00Z", price: 100000, quantity: 2,
    reasonCode: "buy_news", planCode: "plan_target", planTargetPrice: 130000, memo: "",
  },
  {
    id: "t2", userId: 2, side: "sell", symbol: "259960", stockName: "크래프톤",
    tradedAt: "2026-08-15T01:00:00Z", price: 240000, quantity: 3, avgPrice: 200000,
    reasonCode: "sell_fear_drop", planMatch: false, planChangedReason: "change_price_emotion",
  },
];
const feed = feedCards(trades, members, { "005930": 120000 }, { t1: [{ id: "c1", transactionId: "t1", authorName: "찬영엄마", body: "좋은 선택이야", mine: true }] }, { t1: { transactionId: "t1", liked: true, count: 2 } }, "all", now);
// 최신순.
assert.deepEqual(feed.map((f) => f.id), ["t2", "t1"]);
// 본인이 보는 매수 카드는 색 판에 **산 가격**이, 옆 판에 계획이 온다.
const buy = feed[1];
assert.equal(buy.bigValue, "100,000원");
assert.equal(buy.bigBg, "#12874F");
assert.equal(buy.dateLabel, "8월 14일 매수");
// 목표가가 있으면 목표 금액, 없으면 가지고 갈 기간이다. 값은 이 거래 한 건의 **주당**
// 체결가 계열이라, 라벨이 "평단가" 로 고정돼 있을 때는 총 거래금액으로 읽혔다.
assert.equal(buy.sideLabel, "목표 금액");
assert.equal(buy.sideValue, "130,000원");
assert.equal(buy.positive, true);
// 매수 카드의 손익은 **평가** 손익이다 — 지금 시세(120,000) − 산 가격(100,000), 2주.
assert.equal(buy.pnlText, "▲ 40,000원 (+20.00%)");
// 이유·계획·목표가가 한 문장으로 붙는다. **`담았어. `·`팔았어. ` 로 시작하지 않는다** —
// 바로 위 날짜 라벨(`8월 14일 매수`)이 이미 방향을 말하고 있다.
assert.equal(buy.text, "뉴스를 보고 결정했어. 목표 가격이 되면 가지려고 했어. 목표 130,000원.");
assert.equal(buy.text.startsWith("담았어"), false);
assert.equal(buy.shortMent, "뉴스를 보고");
assert.equal(buy.likeCount, 2);
assert.equal(buy.liked, true);
assert.equal(buy.comments[0].canDelete, true);
// 목표가가 없는 매수는 보유 계획을 적는다.
const noTarget = feedCards(
  [{ ...trades[0], planTargetPrice: null, planCode: "plan_season" }],
  members, {}, {}, {}, "all", now,
)[0];
assert.equal(noTarget.sideLabel, "가지고 갈 기간");
assert.equal(noTarget.sideValue, "시즌 끝까지");
// 매도 카드는 **실현** 손익이다 — 판 가격(240,000) − 평단가(200,000), 3주.
// 지금 시세는 쓰지 않는다: 이미 판 주식의 오늘 값은 그 사람이 번 돈과 상관이 없다.
const sell = feed[0];
assert.equal(sell.bigValue, "+20.00%");
assert.equal(sell.sideLabel, "평단가");
assert.equal(sell.sideValue, "200,000원");
assert.equal(sell.pnlText, "▲ 120,000원 (+20.00%)");
assert.equal(sell.dateLabel, "8월 15일 매도");
// 평단가가 없으면 견줄 밑값이 없다. `0원`이 아니라 자리를 비운다.
const noAvg = feedCards(
  [{ ...trades[1], avgPrice: null }], members, {}, {}, {}, "all", now,
)[0];
assert.equal(noAvg.bigValue, "비공개");
assert.equal(noAvg.sideValue, "비공개");
assert.equal(noAvg.pnlText, "");
// 매도는 계획 변경 이유를 덧붙인다.
assert.equal(sell.text, "더 떨어질까 봐 결정했어. 계획을 바꿨어 — 가격이 움직여서 불안해졌어");
// 메모가 있으면 메모가 첫 문장이다 — 고른 이유 문구가 아이가 쓴 말을 밀어내지 않는다.
const memoCard = feedCards(
  [{ ...trades[0], memo: "과자 회사라 믿음이 가!" }],
  members, {}, {}, {}, "all", now,
)[0];
assert.equal(memoCard.text, "과자 회사라 믿음이 가! 목표 가격이 되면 가지려고 했어. 목표 130,000원.");
// 메모도 이유도 계획도 없으면 빈 문자열이다 — 앞뒤 공백만 남은 줄이 카드에 뜨면 안 된다.
const bare = feedCards(
  [{ ...trades[0], memo: "", reasonCode: null, planCode: null, planTargetPrice: null }],
  members, {}, {}, {}, "all", now,
)[0];
assert.equal(bare.text, "");

// 구성원 필터는 그 사람 것만 남긴다.
assert.deepEqual(feedCards(trades, members, {}, {}, {}, "db_1", now).map((f) => f.id), ["t1"]);

// ── 몇 장을 깔지 ─────────────────────────────────────────────────────────
// 한 사람이 몰아서 거래해도 `전체` 에서는 **최신 두 장까지만** 가져간다. 이걸 안 두면
// 그날 많이 거래한 사람이 여섯 장을 통째로 차지해, 가족 피드인데 한 사람 것만 보인다.
const many: FamilyTrade[] = [
  ...Array.from({ length: 5 }, (_, i) => ({
    ...trades[0], id: `child${i}`, userId: 1,
    tradedAt: `2026-08-16T0${i}:00:00Z`,
  })),
  { ...trades[1], id: "mom1", userId: 2, tradedAt: "2026-08-15T02:00:00Z" },
  { ...trades[1], id: "mom2", userId: 2, tradedAt: "2026-08-15T01:00:00Z" },
  { ...trades[0], id: "dad1", userId: 3, tradedAt: "2026-08-14T01:00:00Z" },
];
const spread = feedCards(many, members, {}, {}, {}, "all", now);
assert.equal(spread.length, 5);
assert.deepEqual(spread.map((f) => f.id), ["child4", "child3", "mom1", "mom2", "dad1"]);
// 구성원 칩을 누르면 그 사람 것으로 여섯 장을 채운다 — 두 장 제한은 `전체` 에만 걸린다.
assert.deepEqual(
  feedCards(many, members, {}, {}, {}, "db_1", now).map((f) => f.id),
  ["child4", "child3", "child2", "child1", "child0"],
);
// 여섯 장을 넘기지 않는다.
const flood = feedCards(
  Array.from({ length: 20 }, (_, i) => ({
    ...trades[0], id: `x${i}`, userId: 1, tradedAt: `2026-08-16T${String(i).padStart(2, "0")}:00:00Z`,
  })),
  members, {}, {}, {}, "db_1", now,
);
assert.equal(flood.length, 6);
// 서버가 페이지로 여러 장을 줘도 화면에 까는 것은 여섯 장뿐이다. 더 읽어 오는 이유는
// `holdings` 로 거른 뒤라 한 페이지가 여섯을 못 채울 수 있어서이지, 다 깔기 위해서가 아니다.
const thirteenTrades = Array.from({ length: 13 }, (_, index) => ({
  ...trades[0],
  id: `many-${index}`,
  tradedAt: `2026-08-14T${String(index).padStart(2, "0")}:00:00Z`,
}));
assert.equal(feedCards(thirteenTrades, members, {}, {}, {}, "all", now).length, FEED_PER_MEMBER);

// ── 머리 카드 ────────────────────────────────────────────────────────────
const summary = returnSummary(
  500000,
  [{ code: "005930", qty: 2, avg: 100000 }],
  { "005930": 120000 },
  new Date("2026-08-16T09:00:00+09:00"),
);
assert.equal(summary.pctText, "+20.00%");
assert.equal(summary.pnlText, "▲ 40,000원");
assert.equal(summary.totalText, "740,000원");
// 카드가 `원` 을 따로 붙이므로 숫자만 낸다.
assert.equal(summary.totalNumber, "740,000");
assert.equal(summary.cashText, "500,000원");
// 모의투자에는 결제 대기 중인 돈이 없다 — 출금가능금액은 예수금과 같다.
assert.equal(summary.withdrawText, summary.cashText);
assert.equal(summary.settleText, "결제기준 08.16(일) 15:30");
// 예약 매수 현금은 총자산·예수금에는 남고 새 주문에 쓸 수 있는 금액에서는 빠진다.
const reservedSummary = returnSummary(
  300_000,
  [],
  {},
  new Date("2026-08-16T09:00:00+09:00"),
  200_000,
);
assert.equal(reservedSummary.totalText, "500,000원");
assert.equal(reservedSummary.cashText, "500,000원");
assert.equal(reservedSummary.withdrawText, "300,000원");
// 원금이 0 이면 수익률도 0 이다 — 0 으로 나누지 않는다. 손익 0 은 빨강도 파랑도 아니다.
const flat = returnSummary(100, [], {});
assert.equal(flat.pctText, "0.00%");
assert.equal(flat.pctColor, "#9CA1B4");

// ── 지난 시즌 ────────────────────────────────────────────────────────────
// 한 사람의 시즌 성향은 네 주 중 최빈 유형, 가족 성향은 그 최빈 유형 중 최빈이다.
assert.equal(
  seasonTypeOf([
    { label: "1주차", type: "explorer", count: 1 },
    { label: "2주차", type: "sniper", count: 1 },
    { label: "3주차", type: "sniper", count: 1 },
  ]),
  "sniper",
);
// 동점이면 먼저 나온 주차의 유형을 고른다 — 같은 입력이 늘 같은 답을 내야 한다.
assert.equal(
  seasonTypeOf([
    { label: "1주차", type: "fighter", count: 1 },
    { label: "2주차", type: "explorer", count: 1 },
  ]),
  "fighter",
);
const report = lastSeasonReport();
// 표본은 저격수 2명·전략가 1명이다.
assert.equal(report.type, "sniper");
assert.equal(report.title, "저격수 가족이었어요");
assert.deepEqual(report.members.map((m) => m.title), [
  "시즌 성향 · 저격수",
  "시즌 성향 · 전략가",
  "시즌 성향 · 저격수",
]);
assert.equal(
  report.members[2].trend,
  "주차별로 보면 탐험가 → 승부사 → 저격수 → 저격수 순서였어요.",
);
assert.equal(report.members[0].weeks[0].note, "거래 2건");
// 오각형은 가족 비교와 같은 0~10 스케일이다 — 두 화면을 겹쳐 볼 수 있어야 한다.
assert.deepEqual(report.members.map((m) => m.scaleMax), [10, 10, 10]);

// ── 첫 화면 제목 옆 지갑: 가족 자산 합계 ────────────────────────────────────
// `returnSummary` 와 같은 모양으로 편다 — 두 값이 같은 자리에 번갈아 들어간다.
const famWallet = familySummary({
  assets: 4_500_006, cost: 3_000_000, profit: 6, returnRate: 0.0002, memberCount: 3,
});
assert.equal(famWallet?.totalText, "4,500,006원");
assert.equal(famWallet?.pnlText, "▲ 6원");
assert.equal(famWallet?.pctText, "+0.00%");
// 아직 아무도 안 샀으면 수익률 자리에 `아직` 을 적는다. `0.00%` 는 본전으로 읽힌다.
const idleWallet = familySummary({
  assets: 10_000_000, cost: 0, profit: 0, returnRate: null, memberCount: 2,
});
assert.equal(idleWallet?.pctText, "아직");
assert.equal(idleWallet?.pctColor, "#9CA1B4");
// 합계가 없으면 화면이 내 계좌 요약으로 되돌아갈 수 있게 `null` 을 낸다.
assert.equal(familySummary(null), null);
assert.equal(familySummary(undefined), null);

console.log("archive view tests passed");
