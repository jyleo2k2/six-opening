/**
 * 차단 판정의 **불변식** 검사. 문장 하나하나를 적는 대신 슬롯을 곱해 만든
 * 문장 전부가 같은 경로로 가는지 본다.
 *
 * 구절 목록으로 판정하던 동안에는 `엄마 수익률 알려 줘` 는 막히고
 * `엄마 수익률 얼마야?` 는 새는 식으로 **같은 취지의 문장끼리 판정이 갈렸다**.
 * 낱말을 늘리면 검사도 함께 늘어나야 그 재발을 막을 수 있어서, 예시 목록이
 * 아니라 교차곱으로 적는다.
 */
import assert from "node:assert/strict";
import { routeMessage } from "./routing";
import {
  asksFamilyData,
  asksPopularityFollowing,
  asksTargetPriceDecision,
  asksTradeDecision,
} from "./intent-slots";

const home = { screen: "home" as const };
const stock = {
  screen: "stock" as const,
  stockId: "KRX:259960" as const,
  stockName: "크래프톤",
};

// ── 불변식 1. 가족 데이터 요구는 조합이 무엇이든 보호로 간다 ──────────────
// SPEC §6.1.2 · §6.1.8 W1-061·W4-062. 조회 경로(tool)로 새면 안 된다 —
// 실제로 "엄마가 남긴 거래 이유를 보여 줘" 가 본인 기록 조회로 들어갔었다.
const familyMembers = ["엄마", "아빠", "부모님"];
const familyData = ["수익률", "성향", "거래 기록", "산 거", "거래 이유", "보유 종목"];
const dataRequests = ["알려줘", "보여줘", "얼마야?", "뭐야?", "궁금해"];

for (const member of familyMembers) {
  for (const data of familyData) {
    for (const request of dataRequests) {
      const question = `${member} ${data} ${request}`;
      const routed = routeMessage(question, home);
      assert.equal(
        routed.route,
        "safety",
        `가족 데이터 요구가 보호로 가지 않습니다: "${question}" → ${routed.route}`,
      );
    }
  }
}

// 가족 비교 화면 사용법은 보호 대상이 아니라 안내 대상이다. 위 곱이 넓어져
// 사용법 질문까지 삼키면 아이가 쓸 수 있는 기능이 사라진다.
assert.notEqual(routeMessage("가족 비교는 어떻게 봐?", home).route, "safety");
assert.notEqual(routeMessage("가족 비교 화면 어디 있어?", home).route, "safety");

// 본인 데이터는 같은 낱말을 써도 보호 대상이 아니다.
for (const question of ["내 수익률 얼마야?", "내 거래 기록 보여줘", "내 성향 뭐야?"]) {
  assert.notEqual(
    routeMessage(question, home).route,
    "safety",
    `본인 기록 조회가 보호로 막혔습니다: "${question}"`,
  );
}

// ── 불변식 2. 목표가·손절가를 정해 달라는 요구는 용어 설명으로 새지 않는다 ──
// SPEC §1.3 · §6.1.1. 사이에 낀 부사(`좀`)나 어순이 판정을 바꾸면 안 된다.
const priceNouns = ["목표가", "손절가", "목표 주가"];
const priceRequests = ["정해줘", "좀 정해줘", "얼마로 잡아?", "찍어줘", "설정해줘"];

for (const noun of priceNouns) {
  for (const request of priceRequests) {
    const question = `${noun} ${request}`;
    const routed = routeMessage(question, stock);
    assert.equal(
      routed.route,
      "refusal",
      `가격 결정 요구가 차단되지 않습니다: "${question}" → ${routed.route}`,
    );
  }
}

// 뜻을 묻는 질문은 같은 낱말이어도 승인 용어 설명이다.
for (const question of ["목표가가 뭐야?", "손절가는 무슨 뜻이야?"]) {
  assert.notEqual(
    routeMessage(question, stock).route,
    "refusal",
    `용어 질문이 차단됐습니다: "${question}"`,
  );
}

// ── 불변식 3. 살지 말지 정해 달라는 요구는 어미가 달라도 차단된다 ──────────
// SPEC §6.1.1 · §6.1.4. "…사도 돼?" 는 막히고 "…사도 됨?" 은 새던 자리다.
const decisionEndings = ["사도 돼?", "사도 됨?", "살까?", "사야 돼?", "팔까?", "팔아야 됨?"];
for (const ending of decisionEndings) {
  const question = `이 종목 지금 ${ending}`;
  const routed = routeMessage(question, stock);
  assert.equal(
    routed.route,
    "refusal",
    `매매 판단 요구가 차단되지 않습니다: "${question}" → ${routed.route}`,
  );
}

// 외부 콘텐츠를 근거로 든 매수 판단도 범위 밖이 아니라 추천 차단이다(§6.1.4).
for (const question of [
  "유튜브에서 방산 오른대 지금 사도 됨?",
  "유튜브에서 방산주가 오른다는데 지금 사도 돼?",
]) {
  assert.equal(
    routeMessage(question, home).route,
    "refusal",
    `영상 근거 매수 판단이 추천 차단으로 가지 않습니다: "${question}"`,
  );
}

// 비금융 대상을 고르는 요청은 그대로 범위 밖이어야 한다. 위 완화가 여기까지
// 번지면 "노래 추천해줘" 가 투자 추천 거절로 답하게 된다.
for (const question of ["노래 추천해줘", "제일 인기 있는 웹툰 알려줘", "게임 캐릭터 추천해줘"]) {
  assert.equal(
    routeMessage(question, home).route,
    "outOfScope",
    `비금융 추천이 투자 추천 차단으로 샜습니다: "${question}"`,
  );
}

// ── 불변식 4. 남이 많이 산 것을 따라 사려는 요구는 차단, 본인 기록은 조회 ──
assert.equal(routeMessage("애들이 제일 많이 산 거 뭐야?", home).route, "refusal");
assert.equal(routeMessage("많이 산 주식 알려줘", home).route, "refusal");
assert.notEqual(
  routeMessage("내가 제일 많이 산 종목 뭐야?", home).route,
  "refusal",
  "본인이 많이 산 종목은 본인 기록이라 차단 대상이 아닙니다",
);

// ── 슬롯 술어 자체의 경계 ────────────────────────────────────────────────
assert.equal(asksFamilyData("엄마수익률얼마야"), true);
assert.equal(asksFamilyData("내수익률얼마야"), false);
assert.equal(asksTargetPriceDecision("목표가좀정해줘손절가도"), true);
assert.equal(asksTargetPriceDecision("목표가가무슨뜻이야"), false);
assert.equal(asksTradeDecision("지금사도됨"), true);
assert.equal(asksTradeDecision("생각해볼까"), false);
assert.equal(asksPopularityFollowing("애들이제일많이산거뭐야"), true);
assert.equal(asksPopularityFollowing("내가제일많이산종목뭐야"), false);
assert.equal(asksPopularityFollowing("제일인기있는노래알려줘"), false);
