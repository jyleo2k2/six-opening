import assert from "node:assert/strict";
import { familySummary, feedCards, returnSummary, runners, type FamilyTrade } from "./archive-feed";
import {
  axesFromCard,
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
    tradedAt: "2026-08-15T01:00:00Z", price: null, quantity: null,
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
// 이유·계획·목표가가 한 문장으로 붙는다.
assert.equal(buy.text, "담았어. 뉴스를 보고 결정했어. 목표 가격이 되면 가지려고 했어. 목표 130,000원.");
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
// 남의 카드는 체결가가 마스킹된다 — 화면에서 추론하지 않는다.
const sell = feed[0];
assert.equal(sell.bigValue, "비공개");
assert.equal(sell.sideValue, "비공개");
// 마스킹돼도 라벨은 방향을 따른다 — 값만 가리고 무슨 가격이었는지는 숨기지 않는다.
assert.equal(sell.sideLabel, "판 가격");
assert.equal(sell.dateLabel, "8월 15일 매도");
// 매도는 계획 변경 이유를 덧붙인다.
assert.match(sell.text, /계획을 바꿨어 — 가격이 움직여서 불안해졌어$/u);

// 구성원 필터는 그 사람 것만 남긴다.
assert.deepEqual(feedCards(trades, members, {}, {}, {}, "db_1", now).map((f) => f.id), ["t1"]);

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
