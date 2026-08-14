import assert from "node:assert/strict";
import test from "node:test";
import type { ChildNewsDraft } from "./contracts";
import {
  MAX_VISIBLE_TERM_TREATMENTS,
  selectVisibleTermTreatments,
} from "./visible-term-treatments";

test("실제 노출문에 있는 어려운 용어만 등장 순서대로 최대 3개 보여준다", () => {
  const draft: ChildNewsDraft = {
    articleId: "TERM-LIMIT",
    headline: { text: "테스트기업, 매출과 영업이익 증가", sourceIds: ["S1"] },
    homeSummary: { text: "테스트기업, 매출과 영업이익 증가", sourceIds: ["S1"] },
    body: [
      { role: "key_detail", factKey: "net_income", text: "당기순이익도 늘었어요.", sourceIds: ["S2"] },
      { role: "business_detail", factKey: "dividend", text: "배당은 그대로예요.", sourceIds: ["S3"] },
      { role: "context", factKey: "market", text: "회사가 결과를 발표했어요.", sourceIds: ["S4"] },
    ],
    priceConnection: {
      kind: "business_performance",
      basis: "event_education",
      text: "실적은 회사의 사업 결과를 보여줘요.",
      sourceIds: ["S1"],
    },
    termTreatments: [
      { term: "실적", treatment: "explained", easyText: "회사의 사업 결과", sourceIds: ["S1"] },
      { term: "배당", treatment: "explained", easyText: "회사가 주주에게 나누는 돈", sourceIds: ["S3"] },
      { term: "당기순이익", treatment: "explained", easyText: "모든 비용을 빼고 남은 돈", sourceIds: ["S2"] },
      { term: "영업이익", treatment: "explained", easyText: "본업으로 번 돈", sourceIds: ["S1"] },
      { term: "매출", treatment: "explained", easyText: "판매한 전체 금액", sourceIds: ["S1"] },
      { term: "연결 기준", treatment: "explained", easyText: "관련 회사를 합쳐 계산", sourceIds: ["S5"] },
    ],
  };

  const visible = selectVisibleTermTreatments(draft);
  assert.equal(visible.length, MAX_VISIBLE_TERM_TREATMENTS);
  assert.deepEqual(visible.map((item) => item.term), ["매출", "영업이익", "당기순이익"]);
  assert.equal(visible.some((item) => item.term === "연결 기준"), false);
});
