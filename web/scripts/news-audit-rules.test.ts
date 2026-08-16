import assert from "node:assert/strict";
import { auditSummary, severityOf, type AuditInput } from "./news-audit-rules";

function test(name: string, run: () => void): void {
  run();
  console.log(`✓ ${name}`);
}

const kinds = (input: AuditInput) => auditSummary(input).map((i) => i.kind).sort();

/** 규칙을 고친 뒤의 좋은 예 — 넷마블 신작 기사 재작성안. */
const good: AuditInput = {
  headline: "넷마블, 하반기 새 게임을 3개로 줄였어요",
  lines: [
    "'나 혼자만 레벨업: 카르마' 등 세 게임만 올해 나와요.",
    "'프로젝트 옥토퍼스'와 '이블베인'은 내지 않기로 했어요.",
    "게임 하나 내는 데 사람과 돈이 많이 들어서, 기준을 높이기로 했어요.",
  ],
  citations: { 1: ["S1"], 2: ["S3"], 3: ["S4"] },
  sourceUnits: {
    S1: "기존에 발표했던 신작들 중 '나 혼자만 레벨업: 카르마', '샹그릴라 프론티어: 일곱 최강종', '프로젝트 이지스' 3종만 출시하기로 한 것이다.",
    S3: "당초 넷마블은 하반기 이들 신작 외에도 '프로젝트 옥토퍼스', '이블베인' 등의 신작을 출시하기로 밝힌 바 있다.",
    S4: "하반기 라인업을 조정한 이유는 보다 엄격한 런칭의 기준을 마련할 필요성을 느꼈기 때문이다.",
  },
};

test("고친 요약은 결함이 없다", () => {
  assert.deepEqual(auditSummary(good), []);
  assert.equal(severityOf(auditSummary(good)), 0);
});

test("한 근거를 두 줄로 쪼개면 잡는다 — fact key 가 달라도 통과가 아니다", () => {
  // 넷마블 실적 기사가 이 모양으로 나갔다. S2 하나가 1·2번 줄로 갈렸다.
  const split: AuditInput = {
    headline: "넷마블, 2분기 실적 발표",
    lines: ["매출은 지난해보다 4.4% 늘었어요.", "영업이익은 20.8% 줄었어요.", "매출의 78%를 외국에서 벌었어요."],
    citations: { 1: ["S2"], 2: ["S2"], 3: ["S6"] },
    sourceUnits: {
      S2: "전년 동기 대비 매출은 4.4% 늘었으나 영업이익은 20.8% 감소했다.",
      S6: "2분기 해외 매출은 5808억원으로 전체 매출의 78%를 차지했다.",
    },
  };
  assert.ok(kinds(split).includes("근거공유"));
});

test("근거에 원인이 없으면 잡는다 — 선별 단계 결함이다", () => {
  const noCause: AuditInput = {
    headline: "어떤 회사, 2분기 실적",
    lines: ["매출은 100억원이에요.", "영업이익은 10억원이에요.", "순이익은 5억원이에요."],
    citations: { 1: ["S1"], 2: ["S2"], 3: ["S3"] },
    sourceUnits: { S1: "매출은 100억원이다.", S2: "영업이익은 10억원이다.", S3: "순이익은 5억원이다." },
  };
  assert.ok(kinds(noCause).includes("이유없음"));
  // 원인 문장이 하나만 있어도 통과한다.
  const withCause = { ...noCause, sourceUnits: { ...noCause.sourceUnits, S4: "신제품 출시 효과 덕분이다." } };
  assert.ok(!kinds(withCause).includes("이유없음"));
});

test("근거의 고유명사를 한 줄도 안 쓰면 잡는다", () => {
  const buried: AuditInput = {
    headline: "넷마블, 새 게임 3개만 낸다",
    lines: ["원래는 더 많이 내려고 했어요.", "9월에 보여줘요.", "기준을 엄격하게 하려는 거예요."],
    citations: { 1: ["S1"], 2: ["S2"], 3: ["S3"] },
    sourceUnits: {
      S1: "'나 혼자만 레벨업: 카르마' 등 3종만 출시한다.",
      S2: "9월 도쿄 게임쇼에서 공개할 예정이다.",
      S3: "엄격한 기준을 마련할 필요성을 느꼈기 때문이다.",
    },
  };
  assert.ok(kinds(buried).includes("이름사장"));
  // 한 줄이라도 살리면 통과다.
  const kept = { ...buried, lines: ["'나 혼자만 레벨업: 카르마' 등 세 게임만 나와요.", ...buried.lines.slice(1)] };
  assert.ok(!kinds(kept).includes("이름사장"));
});

test("제목이 이미 말한 수치를 되풀이하면 잡는다", () => {
  const echo: AuditInput = {
    headline: "롯데렌탈, 2분기 매출 7658억원 영업이익 846억원",
    lines: ["2분기 매출은 7658억원이에요.", "영업이익은 846억원이에요.", "짧게 빌려주는 차도 매출이 늘었어요."],
    citations: { 1: ["S1"], 2: ["S2"], 3: ["S3"] },
    sourceUnits: { S1: "매출 7658억원", S2: "영업이익 846억원", S3: "단기 렌털 매출이 늘어난 영향이다." },
  };
  assert.ok(kinds(echo).includes("제목반복"));
});

test("근거에 없는 숫자는 잡되, 수관형사는 봐준다", () => {
  const made: AuditInput = {
    headline: "어떤 회사 공장",
    lines: ["1년에 5억 개를 만들 수 있어요.", "유럽으로 보낼 거예요.", "수출을 늘리려는 것이에요."],
    citations: { 1: ["S1"], 2: ["S2"], 3: ["S3"] },
    sourceUnits: { S1: "연간 5억개 생산 능력을 갖춘다.", S2: "유럽으로 수출한다.", S3: "수출을 늘리기 위해서다." },
  };
  // "1년" 의 1 은 원문에 없지만 지어낸 값이 아니다.
  assert.ok(!kinds(made).includes("숫자무근거"));

  const fabricated = { ...made, lines: ["1년에 9억 개를 만들 수 있어요.", ...made.lines.slice(1)] };
  assert.ok(kinds(fabricated).includes("숫자무근거"));
});

test("14자 이하 줄을 잡는다", () => {
  const thin: AuditInput = {
    headline: "엔씨소프트 아이온2, 하반기 출시",
    lines: ["10개 언어로 만들어요.", "컴퓨터로만 할 수 있어요.", "전 세계에 동시에 내려는 것이에요."],
    citations: { 1: ["S1"], 2: ["S2"], 3: ["S3"] },
    sourceUnits: { S1: "10개 언어를 지원한다.", S2: "PC 전용으로 출시한다.", S3: "글로벌 동시 출시를 위해서다." },
  };
  assert.ok(kinds(thin).includes("빈줄"));
});

console.log("news-audit-rules tests passed");
