import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseCitation,
  chooseTermCitation,
  factKeysFor,
  numbersIn,
  supportScore,
  ungroundedNumbers,
} from "./citation-match";

const UNITS = [
  { id: "S1", text: "S-OIL을 포함한 국내 정유 4사의 올해 상반기 영업이익 합계는 14조 7,906억원으로 집계됐다." },
  { id: "S2", text: "정유업계는 정제마진 개선을 배경으로 꼽았다." },
  { id: "S3", text: "S-OIL의 윤활기유 부문 영업이익은 4774억원으로 역대 최고를 기록했다." },
];

test("쉼표와 공백을 지우고 숫자를 읽는다", () => {
  assert.deepEqual(numbersIn("14조 7,906억원"), ["14", "7906"]);
});

test("숫자가 겹치면 낱말만 겹칠 때보다 높게 본다", () => {
  const withNumber = supportScore("국내 정유 4사 상반기 영업이익은 14조7906억원이에요.", UNITS[0].text);
  const wordsOnly = supportScore("정유 회사들이 영업이익을 냈어요.", UNITS[0].text);
  assert.ok(withNumber > wordsOnly, `${withNumber} > ${wordsOnly}`);
});

test("가장 잘 뒷받침하는 문장을 고른다", () => {
  const choice = chooseCitation("국내 정유 4사 상반기 영업이익은 14조7906억원이에요.", UNITS);
  assert.deepEqual(choice?.sourceIds, ["S1"]);
});

test("이미 쓴 근거는 뒤로 미룬다 — 한 문장을 쪼갠 두 줄을 막는다", () => {
  const first = chooseCitation("영업이익은 14조7906억원이에요.", UNITS);
  assert.deepEqual(first?.sourceIds, ["S1"]);
  const second = chooseCitation(
    "윤활기유 영업이익은 4774억원이에요.",
    UNITS,
    new Set(first!.sourceIds),
  );
  assert.deepEqual(second?.sourceIds, ["S3"]);
});

test("다른 후보가 없으면 이미 쓴 근거라도 다시 쓴다", () => {
  const only = [UNITS[0]];
  const choice = chooseCitation("영업이익은 14조7906억원이에요.", only, new Set(["S1"]));
  assert.deepEqual(choice?.sourceIds, ["S1"]);
});

test("어디에도 걸리지 않는 줄은 근거를 만들어 내지 않는다", () => {
  assert.equal(chooseCitation("오늘 점심은 김밥이에요.", UNITS), null);
});

test("조사가 붙어도 같은 낱말로 본다 — 실측에서 SK하이닉스·대한항공이 걸린 자리", () => {
  const units = [
    { id: "S1", text: "최 회장은 칩 가격 상승이 완제품 가격 인상으로 번지는 칩플레이션(반도체 가격 급등)에도 우려를 나타냈다." },
    { id: "S2", text: "SK하이닉스는 인디애나주에 첨단 패키징 공장을 짓고 있다." },
  ];
  assert.deepEqual(chooseCitation("반도체가 들어가는 제품 가격도 오를 거래요.", units)?.sourceIds, ["S1"]);
});

test("문장 쪽에 조사가 붙어 있어도 찾는다", () => {
  const units = [{ id: "S1", text: "노선과 스케줄 선택의 폭이 넓어져 더욱 편리하게 여행 계획을 세울 수 있다." }];
  assert.deepEqual(chooseCitation("출발 시간대를 다시 나눠 선택 폭을 넓힐 계획이에요.", units)?.sourceIds, ["S1"]);
});

test("기사에 없는 숫자를 잡아낸다 — 실측에서 에스엠이 걸린 자리", () => {
  const article = "이에 따라 올해 영업이익 전망치도 낮아졌다. 목표주가 12만원을 제시했다.";
  assert.deepEqual(
    ungroundedNumbers("영업이익은 529억원으로 지난해보다 11% 늘었어요.", article),
    ["529", "11"],
  );
});

test("기사에 있는 숫자는 쉼표·공백이 달라도 통과시킨다", () => {
  const article = "정유 4사의 영업이익 합계는 14조 7,906억원으로 집계됐다.";
  assert.deepEqual(ungroundedNumbers("정유 4사 영업이익은 14조7906억원이에요.", article), []);
});

test("'1년'·'1위' 의 1 은 지어낸 값으로 보지 않는다", () => {
  assert.deepEqual(ungroundedNumbers("1년 만에 다시 열려요.", "행사가 다시 열린다."), []);
});

test("공백을 사이에 둔 두 숫자를 하나로 붙여 읽지 않는다 — 실측에서 JYP 가 걸린 자리", () => {
  assert.deepEqual(numbersIn("빌보드 200 1위"), ["200", "1"]);
  assert.deepEqual(ungroundedNumbers("빌보드 200 1위 횟수가 가장 많아요.", "빌보드 200 1위에 올랐다."), []);
});

test("'1천' 과 '1000' 을 같은 값으로 본다 — 실측에서 LG생활건강·현대글로비스가 걸린 자리", () => {
  assert.deepEqual(ungroundedNumbers("약 9만1000명이 참여했어요.", "약 9만 1천 명의 학생이 함께했다."), []);
});

test("억 아래를 버린 반올림은 지어낸 값이 아니다 — 실측에서 달바글로벌이 걸린 자리", () => {
  const article = "2분기 매출은 1868억 6100만 원으로 45.6% 늘었다.";
  assert.deepEqual(ungroundedNumbers("2분기 매출은 1869억원으로 역대 최대예요.", article), []);
});

test("소수를 정수로 반올림한 비율도 지어낸 값이 아니다 — 달바글로벌 해외 비중", () => {
  const article = "전체 매출에서 해외가 차지하는 비중은 올해 2분기 75.7%로 높아졌다.";
  assert.deepEqual(ungroundedNumbers("전체 매출의 76%가 해외에서 나왔어요.", article), []);
});

test("날짜는 반올림으로 봐 주지 않는다 — 실측에서 대한항공이 걸린 자리", () => {
  const article = "16일 대한항공에 따르면 양사는 12월부터 통합 운항한다.";
  assert.deepEqual(ungroundedNumbers("12월 17일 통합 항공사로 출범해요.", article), ["17"]);
});

test("기사보다 정밀한 숫자는 반올림으로 봐 주지 않는다 — 실측에서 BGF리테일·코웨이가 걸린 자리", () => {
  const article = "BGF리테일의 2분기 연결 기준 매출은 2조4000억원으로 6% 증가했다.";
  assert.deepEqual(ungroundedNumbers("2분기 매출은 2조4268억원이에요.", article), ["4268"]);
});

test("용어는 낱말이 그대로 있는 문장을 가리킨다", () => {
  assert.deepEqual(chooseTermCitation("정제마진", UNITS, "S1"), ["S2"]);
});

test("낱말이 원문에 없으면 넘겨받은 근거로 떨어뜨린다 — sourceIds 는 비면 안 된다", () => {
  assert.deepEqual(chooseTermCitation("모르는말", UNITS, "S1"), ["S1"]);
});

test("factKey 는 서로 달라야 한다", () => {
  const keys = factKeysFor([
    "영업이익은 1762억원이에요.",
    "영업이익률도 올랐어요.",
    "해외 매출이 늘었어요.",
  ]);
  assert.equal(new Set(keys).size, 3, keys.join(","));
  assert.ok(keys.every((key) => /^[a-z0-9_]+$/u.test(key)), keys.join(","));
});
