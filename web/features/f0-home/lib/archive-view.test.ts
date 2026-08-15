import assert from "node:assert/strict";
import { feedCards, returnSummary, runners, type FamilyTrade } from "./archive-feed";
import {
  axesFromCard,
  familyMembers,
  myProfile,
  resolveType,
  typeKeyOf,
  weekCards,
  type FamilyRow,
} from "./archive-profile-view";

// ── 성향: 두 스케일이 섞이면 오각형이 조용히 거짓말을 한다 ────────────────────
const card = {
  scores: { focus: 8, diversification: 3, accuracy: 5, intuition: 2, evidence: 9 },
  character: "sniper",
  level: 3,
  samples: { buys: 4, sells: 1 },
};
assert.deepEqual(axesFromCard(card), [8, 3, 5, 2, 9]);

// season-cards 누적이 있으면 그게 정본이고 0~10 이다.
const logged = myProfile({ cumulative: card }, { count: 99, scores: [50, 50, 50, 50, 50], level: 1 });
assert.deepEqual(logged.scores, [8, 3, 5, 2, 9]);
assert.equal(logged.scaleMax, 10);
assert.equal(logged.level, 3);
assert.equal(logged.characterKey, "sniper");
assert.equal(logged.sampleCount, 5);

// 없으면 로컬 구버전(0~100) 폴백. 스케일이 함께 바뀐다.
const fallback = myProfile(null, { count: 2, scores: [70, 20, 50, 10, 90], level: 1 });
assert.equal(fallback.scaleMax, 100);
assert.equal(fallback.characterKey, null);

// 서버가 예전 이름으로 준 캐릭터는 지금 이름에 맞춘다. 모르는 값은 null.
assert.equal(typeKeyOf("challenger"), "fighter");
assert.equal(typeKeyOf("sniper"), "sniper");
assert.equal(typeKeyOf("없는유형"), null);
assert.equal(typeKeyOf(null), null);

// 행동 데이터가 정한 캐릭터는 축 점수를 이긴다 (F9 SPEC §3.2 대체 입력).
const overridden = resolveType([9, 1, 5, 1, 9], 2, "explorer");
assert.equal(overridden.key, "explorer");
assert.equal(overridden.title, "탐험가 LV2");
assert.equal(overridden.ink, "#1B3F35");

// ── 카드 모아보기: 기록이 있는 주 + 이번 주, 오래된 순 ──────────────────────
const now = new Date("2026-08-15T09:00:00+09:00").getTime(); // 토요일
const sectorOf = () => "game";
const myType = resolveType([8, 3, 5, 2, 9], 3, "sniper");
const cards = weekCards(
  { cumulative: card, weeks: [{ weekStart: "2026-08-03", count: 2, card }] },
  logged,
  myType,
  [{ user_id: "me", ts: "2026-08-04T01:00:00Z", symbol: "005930", reason_code: "buy_news", qty: 1, amount_krw: 1000, order_status: "filled" }],
  "me",
  sectorOf,
  now,
);
// 8/3 주와 이번 주(8/10) 두 장.
assert.equal(cards.length, 2);
assert.equal(cards[1].week, "이번 주");
// 이번 주 카드는 성향 탭과 같은 유형이어야 한다 — 한 화면에서 갈리면 안 된다.
assert.equal(cards[1].title, myType.title);
assert.deepEqual(cards[1].scores, logged.scores);
// 지난 주는 서버가 채점한 값(0~10)이 로컬 재계산보다 우선한다.
assert.equal(cards[0].scaleMax, 10);
assert.equal(cards[0].date, "8/3 – 8/9");

// 산 게 없는 이번 주는 문구가 다르다.
const empty = weekCards(null, fallback, myType, [], "me", sectorOf, now);
assert.equal(empty.length, 1);
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
assert.equal(lanes[2].at, 40);
assert.equal(lanes[2].pctText, "아직");
// 플러스는 오른쪽, 마이너스는 왼쪽을 보고 선다.
assert.ok(lanes[0].at > 40);
assert.equal(lanes[0].minus, false);
assert.ok(lanes[1].at < 40);
assert.equal(lanes[1].minus, true);
assert.equal(lanes[1].pctText, "−4.2%");
// 트랙 밖으로는 못 나간다.
const extreme = runners([{ id: 9, name: "x", role: "child", returnRate: 9999 }]);
assert.ok(extreme[0].at <= 87);

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
// 본인이 보는 카드는 체결가와 등락률이 보인다.
const buy = feed[1];
assert.equal(buy.avgText, "100,000원");
// 값은 이 거래 한 건의 **주당** 체결가다. 2주를 20만원어치 샀어도 10만원으로 적힌다 —
// 라벨이 "평단가" 로 고정돼 있을 때는 이 숫자가 총 거래금액으로 읽혔다.
assert.equal(buy.avgLabel, "산 가격");
assert.equal(buy.bigPctText, "+20.00%");
assert.equal(buy.positive, true);
// 이유·계획·목표가가 한 문장으로 붙는다.
assert.equal(buy.text, "담았어. 뉴스를 보고 결정했어. 목표 가격이 되면 가지려고 했어. 목표 130,000원.");
assert.equal(buy.oneLiner, "뉴스를 보고");
assert.equal(buy.likeCount, 2);
assert.equal(buy.liked, true);
assert.equal(buy.comments[0].canDelete, true);
// 남의 카드는 체결가가 마스킹돼 등락률 대신 매도만 적는다 — 화면에서 추론하지 않는다.
const sell = feed[0];
assert.equal(sell.avgText, "비공개");
// 마스킹돼도 라벨은 방향을 따른다 — 값만 가리고 무슨 가격이었는지는 숨기지 않는다.
assert.equal(sell.avgLabel, "판 가격");
assert.equal(sell.bigPctText, "매도");
// 매도는 계획 변경 이유를 덧붙인다.
assert.match(sell.text, /계획을 바꿨어 — 가격이 움직여서 불안해졌어$/u);

// 구성원 필터는 그 사람 것만 남긴다.
assert.deepEqual(feedCards(trades, members, {}, {}, {}, "db_1", now).map((f) => f.id), ["t1"]);

// ── 머리 카드 ────────────────────────────────────────────────────────────
const summary = returnSummary(500000, [{ code: "005930", qty: 2, avg: 100000 }], { "005930": 120000 });
assert.equal(summary.pctText, "+20.00%");
assert.equal(summary.totalText, "740,000원");
assert.equal(summary.cashText, "500,000원");
// 원금이 0 이면 수익률도 0 이다 — 0 으로 나누지 않는다.
assert.equal(returnSummary(100, [], {}).pctText, "+0.00%");

console.log("archive view tests passed");
