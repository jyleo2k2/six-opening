import assert from "node:assert/strict";
import type {
  ChildNewsDraft,
  HeadlineScreenResult,
  NewsRoleRequest,
  NewsRoleRunner,
  NewsSourceArticle,
  NewsUniverseCompany,
  PublicationReview,
  SelectorAccept,
  SelectorReject,
} from "./contracts";
import {
  CHILD_NEWS_SUMMARY_LINE_COUNT,
  CHILD_NEWS_SUMMARY_LINE_MAX_LENGTH,
} from "./contracts";
import {
  atomizeSourceUnits,
  isReadyForStorage,
  processNewsCandidate,
  runNewsPipeline,
} from "./pipeline";

const namedUniverse: NewsUniverseCompany[] = [
  { stockId: "KRX:005930", name: "삼성전자", aliases: ["삼전"] },
  { stockId: "KRX:000660", name: "SK하이닉스", aliases: ["하이닉스"] },
  { stockId: "KRX:000120", name: "CJ대한통운" },
  { stockId: "KRX:105560", name: "KB금융" },
  { stockId: "KRX:005380", name: "현대차", aliases: ["현대자동차"] },
  { stockId: "KRX:039490", name: "키움증권" },
  { stockId: "KRX:263750", name: "펄어비스" },
];
const universe: NewsUniverseCompany[] = [
  ...namedUniverse,
  ...Array.from({ length: 51 - namedUniverse.length }, (_, index) => ({
    stockId: `KRX:TEST${String(index + 1).padStart(3, "0")}`,
    name: `테스트기업${index + 1}`,
  })),
];

function article(
  articleId: string,
  title: string,
  sourceTexts: string[],
  scope: NewsSourceArticle["scope"] = "company",
): NewsSourceArticle {
  return {
    articleId,
    runDateKst: "2026-08-12",
    scope,
    title,
    publisher: "테스트뉴스",
    publishedAt: "2026-08-12T09:00:00+09:00",
    sourceUrl: `https://example.com/${articleId}`,
    sourceUnits: sourceTexts.map((text, index) => ({ id: `S${index + 1}`, text })),
  };
}

function accepted(
  target: NewsSourceArticle,
  options: Partial<SelectorAccept> = {},
): SelectorAccept {
  const ids = atomizeSourceUnits(target.sourceUnits).map((unit) => unit.id);
  return {
    articleId: target.articleId,
    decision: "accept",
    kind: target.scope,
    primaryStockIds: target.scope === "company" ? ["KRX:005930"] : [],
    eventType:
      target.scope === "company" ? "earnings" : "observed_market_move",
    focusStatement: "삼성전자와 SK하이닉스 주가가 올랐다.",
    anchorSourceId: ids[0],
    includedSourceIds: ids,
    excludedSourceIds: [],
    difficultTerms: [],
    reasonCodes: [],
    reasons: [],
    ...options,
  };
}

function rejected(target: NewsSourceArticle, code: SelectorReject["reasonCodes"][number]): SelectorReject {
  const ids = atomizeSourceUnits(target.sourceUnits).map((unit) => unit.id);
  return {
    articleId: target.articleId,
    decision: "reject",
    kind: "ineligible",
    primaryStockIds: [],
    eventType: "none",
    focusStatement: "",
    anchorSourceId: "",
    includedSourceIds: [],
    excludedSourceIds: ids,
    difficultTerms: [],
    reasonCodes: [code],
    reasons: ["게시 범위가 아닙니다."],
  };
}

function headlinePassed(target: NewsSourceArticle): HeadlineScreenResult {
  return {
    articleId: target.articleId,
    decision: "pass",
    reasonCodes: [],
    reasons: ["본문을 확인할 후보입니다."],
  };
}

function headlineRejected(
  target: NewsSourceArticle,
  code: SelectorReject["reasonCodes"][number],
): HeadlineScreenResult {
  return {
    articleId: target.articleId,
    decision: "reject",
    reasonCodes: [code],
    reasons: ["제목에서 제외 대상임이 명확합니다."],
  };
}

function draft(
  target: NewsSourceArticle,
  sourceId: string,
  overrides: Partial<ChildNewsDraft> = {},
): ChildNewsDraft {
  return {
    articleId: target.articleId,
    headline: { text: "삼성전자·SK하이닉스 주가 상승", sourceIds: [sourceId] },
    homeSummary: {
      text: "오늘 두 반도체 회사의 주가가 올랐어요.",
      sourceIds: [sourceId],
    },
    body: [
      {
        role: "core_event",
        text: "삼성전자와 SK하이닉스 주가가 올랐어요.",
        sourceIds: [sourceId],
      },
      {
        role: "business_connection",
        text: "주가는 주식 한 주의 가격을 뜻해요.",
        sourceIds: [sourceId],
      },
      {
        role: "context",
        text: "오늘 국내 시장에서 확인된 움직임이에요.",
        sourceIds: [sourceId],
      },
    ],
    termTreatments: [],
    ...overrides,
  };
}

function approvedReview(
  target: NewsSourceArticle,
  options: Partial<PublicationReview> = {},
): PublicationReview {
  return {
    articleId: target.articleId,
    independentKind: target.scope,
    primaryStockIds: target.scope === "company" ? ["KRX:005930"] : [],
    eventType:
      target.scope === "company" ? "earnings" : "observed_market_move",
    focusStatement: "삼성전자와 SK하이닉스 주가가 올랐다.",
    anchorSourceIds: [atomizeSourceUnits(target.sourceUnits)[0].id],
    checks: {
      allowedScope: true,
      primarySubject: true,
      directMateriality: true,
      sourceFidelity: true,
      focusAlignment: true,
      conciseThreeLineSummary: true,
      noIrrelevantDetail: true,
      attributionAndTiming: true,
      allTermsEasy: true,
      investmentSafety: true,
      noSentimentLabel: true,
    },
    issues: [],
    ...options,
  };
}

async function testFocusIsolation() {
  const target = article(
    "01",
    "삼성전자·SK하이닉스 주가 상승, 코스닥은 열흘 새 32%",
    [
      "삼성전자와 SK하이닉스 주가가 각각 올랐다.",
      "코스닥은 열흘 새 32% 상승했다.",
    ],
    "market",
  );
  const selection = accepted(target, {
    primaryStockIds: [],
    eventType: "observed_market_move",
    anchorSourceId: "S1",
    includedSourceIds: ["S1"],
    excludedSourceIds: ["S2"],
  });
  let editorInput: Extract<NewsRoleRequest, { role: "child_news_editor" }> | undefined;
  const runRole: NewsRoleRunner = async (request) => {
    if (request.role === "headline_screener") {
      assert.equal(request.reasoningEffort, "max");
      return headlinePassed(target);
    }
    if (request.role === "relevance_selector") {
      assert.equal(request.reasoningEffort, "max");
      return selection;
    }
    if (request.role === "child_news_editor") {
      assert.equal(request.reasoningEffort, "high");
      editorInput = request;
      return draft(target, "S1");
    }
    assert.equal(request.reasoningEffort, "max");
    return approvedReview(target, {
      primaryStockIds: [],
      eventType: "observed_market_move",
    });
  };

  const result = await processNewsCandidate(target, { runRole, universe });
  assert.equal(result.status, "ready_for_storage");
  assert.deepEqual(editorInput?.sourceUnits.map((unit) => unit.id), ["S1"]);
  assert.equal(
    editorInput?.sourceUnits.some((unit) => unit.text.includes("코스닥")),
    false,
  );
  assert.equal(isReadyForStorage(result), true);
}

async function testHeadlineScreenRejectsRoutineNews() {
  const fixtures = [
    article("03", "CJ대한통운, 이색 채용설명회 개최", ["현직자와 함께 뛰는 채용 행사다."]),
    article("04", "KB금융, 국립소방병원에 영웅쉼터 기부", ["소방관 회복을 지원한다."]),
    article("09", "현대차, 임직원 AI 아이디어 경진대회 개최", ["사내 행사를 열었다."]),
  ];

  for (const target of fixtures) {
    let calls = 0;
    let headlineRequest: Extract<NewsRoleRequest, { role: "headline_screener" }> | undefined;
    const result = await processNewsCandidate(target, {
      universe,
      runRole: async (request) => {
        calls += 1;
        assert.equal(request.role, "headline_screener");
        headlineRequest = request;
        return headlineRejected(target, "ROUTINE_OR_PROMOTIONAL");
      },
    });
    assert.equal(result.status, "rejected");
    assert.equal(result.stage, "prefilter");
    assert.equal(calls, 1);
    assert.equal(headlineRequest?.reasoningEffort, "max");
    assert.equal("sourceUnits" in (headlineRequest?.article ?? {}), false);
    assert.equal((headlineRequest?.examples.length ?? 0) > 0, true);
  }
}

async function testSecondaryCompanyRejected() {
  const target = article(
    "10",
    "씽크풀, AI 투자정보 서비스 출시",
    ["씽크풀이 만든 서비스를 키움증권 채널에서 제공한다."],
  );
  let editorCalls = 0;
  const result = await processNewsCandidate(target, {
    universe,
    runRole: async (request) => {
      if (request.role === "headline_screener") return headlinePassed(target);
      if (request.role === "relevance_selector") {
        return rejected(target, "COMPANY_NOT_PRIMARY_SUBJECT");
      }
      editorCalls += 1;
      return {};
    },
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.stage, "selector");
  assert.equal(editorCalls, 0);
}

async function testAllTermsAndRetry() {
  const target = article(
    "06",
    "펄어비스 게임 600만 장 판매",
    ["펄어비스 게임의 누적 판매량이 600만 장을 넘었다."],
  );
  const selection = accepted(target, {
    primaryStockIds: ["KRX:263750"],
    eventType: "sales_or_production",
    focusStatement: "펄어비스 게임 판매량이 600만 장을 넘었다.",
    difficultTerms: [{ term: "누적 판매량", sourceIds: ["S1"] }],
  });
  const goodDraft = draft(target, "S1", {
    headline: { text: "펄어비스 게임 600만 장 판매", sourceIds: ["S1"] },
    homeSummary: {
      text: "펄어비스 게임이 지금까지 600만 장 넘게 팔렸어요.",
      sourceIds: ["S1"],
    },
    body: [
      {
        role: "core_event",
        text: "펄어비스 게임이 지금까지 600만 장 넘게 팔렸어요.",
        sourceIds: ["S1"],
      },
      {
        role: "business_connection",
        text: "처음부터 지금까지 팔린 수가 600만 장을 넘었어.",
        sourceIds: ["S1"],
      },
      {
        role: "context",
        text: "판매량을 알린 회사는 펄어비스야.",
        sourceIds: ["S1"],
      },
    ],
    termTreatments: [
      {
        term: "누적 판매량",
        treatment: "replaced",
        easyText: "처음부터 지금까지 팔린 수",
      },
    ],
  });
  let editorCalls = 0;
  const reasoning: string[] = [];
  const revisionReasons: string[][] = [];
  const runRole: NewsRoleRunner = async (request) => {
    if (request.role === "headline_screener") return headlinePassed(target);
    if (request.role === "relevance_selector") return selection;
    if (request.role === "child_news_editor") {
      editorCalls += 1;
      reasoning.push(request.reasoningEffort);
      revisionReasons.push(request.revisionReasons);
      return editorCalls === 1
        ? { ...goodDraft, termTreatments: [] }
        : goodDraft;
    }
    return approvedReview(target, {
      primaryStockIds: ["KRX:263750"],
      eventType: "sales_or_production",
    });
  };

  const result = await processNewsCandidate(target, { runRole, universe });
  assert.equal(result.status, "ready_for_storage");
  assert.equal(result.editorAttempts, 2);
  assert.deepEqual(reasoning, ["high", "high"]);
  assert.equal(revisionReasons[1].some((reason) => reason.includes("어려운 용어")), true);
}

async function testFamiliarNumbersIgnoredAndExactTermReplacementAccepted() {
  const target = article(
    "short-easy-term",
    "삼성전자 주가 2% 상승",
    ["12일 삼성전자 주가는 2% 올랐고 주가지수 거래금액은 1.7조원이었다."],
    "market",
  );
  const selection = accepted(target, {
    primaryStockIds: [],
    eventType: "observed_market_move",
    focusStatement: "삼성전자 주가가 올랐다.",
    difficultTerms: [
      { term: "주가", sourceIds: ["S1"] },
      { term: "2%", sourceIds: ["S1"] },
      { term: "1.7조원", sourceIds: ["S1"] },
    ],
  });
  const edited = draft(target, "S1", {
    headline: { text: "삼성전자 주식값과 주가지수 상승", sourceIds: ["S1"] },
    homeSummary: {
      text: "8월 12일 삼성전자 주식값과 주가지수가 올랐어요.",
      sourceIds: ["S1"],
    },
    body: [
      {
        role: "core_event",
        text: "12일 삼성전자 주식값은 2% 올랐어.",
        sourceIds: ["S1"],
      },
      {
        role: "business_connection",
        text: "주식값은 주식 한 주의 가격을 뜻해.",
        sourceIds: ["S1"],
      },
      {
        role: "context",
        text: "주가지수 거래금액은 1.7조원이었어.",
        sourceIds: ["S1"],
      },
    ],
    termTreatments: [
      { term: "주가", treatment: "replaced", easyText: "주식값" },
    ],
  });

  const result = await processNewsCandidate(target, {
    universe,
    runRole: async (request) => {
      if (request.role === "headline_screener") return headlinePassed(target);
      if (request.role === "relevance_selector") return selection;
      if (request.role === "child_news_editor") return edited;
      return approvedReview(target, {
        primaryStockIds: [],
        eventType: "observed_market_move",
      });
    },
  });

  assert.equal(result.status, "ready_for_storage");
  if (result.status === "ready_for_storage") {
    assert.deepEqual(result.selection.difficultTerms.map((item) => item.term), ["주가"]);
  }
}

async function testThreeLineSummaryAndKospiExplanation() {
  const target = article(
    "kospi-three-lines",
    "코스피 6500선 회복",
    ["12일 코스피가 6500선을 회복했고 삼성전자 주가는 4%, SK하이닉스는 2% 올랐다."],
    "market",
  );
  const selection = accepted(target, {
    primaryStockIds: [],
    eventType: "observed_market_move",
    focusStatement: "코스피가 6500선을 회복했다.",
    difficultTerms: [{ term: "코스피", sourceIds: ["S1"] }],
  });
  const goodDraft = draft(target, "S1", {
    headline: { text: "코스피 6500선 회복", sourceIds: ["S1"] },
    homeSummary: {
      text: "오늘 코스피가 6500선을 회복했어.",
      sourceIds: ["S1"],
    },
    body: [
      {
        role: "core_event",
        text: "12일 코스피가 6500선을 다시 넘었어.",
        sourceIds: ["S1"],
      },
      {
        role: "business_connection",
        text: "삼성전자는 4%, SK하이닉스는 2% 올랐어.",
        sourceIds: ["S1"],
      },
      {
        role: "context",
        text: "코스피는 국내 주식시장을 대표하는 숫자야.",
        sourceIds: ["S1"],
      },
    ],
    termTreatments: [
      {
        term: "코스피",
        treatment: "explained",
        easyText: "국내 주식시장을 대표하는 숫자",
      },
    ],
  });
  const repeatedDraft = {
    ...goodDraft,
    homeSummary: {
      text: "코스피는 국내 주식시장을 대표하는 숫자야.",
      sourceIds: ["S1"],
    },
    body: [
      {
        ...goodDraft.body[0],
        text: "삼성전자와 SK하이닉스 주식값이 올랐어.",
      },
      {
        ...goodDraft.body[1],
        text: "삼성전자는 4%, SK하이닉스는 2% 올랐어.",
      },
      {
        ...goodDraft.body[2],
        text: "6500선은 코스피의 기준 숫자야.",
      },
    ],
  };
  let editorCalls = 0;
  const revisionReasons: string[][] = [];
  const result = await processNewsCandidate(target, {
    universe,
    runRole: async (request) => {
      if (request.role === "headline_screener") return headlinePassed(target);
      if (request.role === "relevance_selector") return selection;
      if (request.role === "child_news_editor") {
        editorCalls += 1;
        revisionReasons.push(request.revisionReasons);
        return editorCalls === 1 ? repeatedDraft : goodDraft;
      }
      return approvedReview(target, {
        primaryStockIds: [],
        eventType: "observed_market_move",
      });
    },
  });

  assert.equal(result.status, "ready_for_storage");
  assert.equal(result.editorAttempts, 2);
  assert.equal(
    revisionReasons[1].some((reason) => reason.includes("같은 사실")),
    true,
  );
  assert.equal(
    revisionReasons[1].some((reason) =>
      reason.includes("서비스 3줄 요약"),
    ),
    true,
  );
  if (result.status === "ready_for_storage") {
    assert.equal(result.draft.body.length, CHILD_NEWS_SUMMARY_LINE_COUNT);
    assert.equal(
      result.draft.body.every(
        (line) => line.text.length <= CHILD_NEWS_SUMMARY_LINE_MAX_LENGTH,
      ),
      true,
    );
    assert.equal(result.draft.body[2].text.includes("코스피"), true);
    assert.equal(
      result.draft.body[2].text.includes("국내 주식시장을 대표하는 숫자"),
      true,
    );
  }
}

async function testSummaryLineLengthRetry() {
  const target = article(
    "three-line-length",
    "삼성전자 실적 발표",
    ["삼성전자가 실적을 발표했다."],
  );
  const selection = accepted(target);
  const goodDraft = draft(target, "S1", {
    headline: { text: "삼성전자 실적 발표", sourceIds: ["S1"] },
    homeSummary: {
      text: "삼성전자가 회사의 실적을 발표했어.",
      sourceIds: ["S1"],
    },
    body: [
      {
        role: "core_event",
        text: "삼성전자가 회사의 실적을 발표했어.",
        sourceIds: ["S1"],
      },
      {
        role: "business_connection",
        text: "실적은 회사가 거둔 결과를 뜻해.",
        sourceIds: ["S1"],
      },
      {
        role: "context",
        text: "발표한 회사는 삼성전자야.",
        sourceIds: ["S1"],
      },
    ],
  });
  const longDraft = {
    ...goodDraft,
    body: [
      {
        ...goodDraft.body[0],
        text: "삼성전자가 아주 긴 설명을 여러 번 이어서 말해 한 줄 제한을 넘겼어요.",
      },
      goodDraft.body[1],
      goodDraft.body[2],
    ],
  };
  let editorCalls = 0;
  const revisionReasons: string[][] = [];
  const result = await processNewsCandidate(target, {
    universe,
    runRole: async (request) => {
      if (request.role === "headline_screener") return headlinePassed(target);
      if (request.role === "relevance_selector") return selection;
      if (request.role === "child_news_editor") {
        editorCalls += 1;
        revisionReasons.push(request.revisionReasons);
        return editorCalls === 1 ? longDraft : goodDraft;
      }
      return approvedReview(target);
    },
  });

  assert.equal(result.status, "ready_for_storage");
  assert.equal(result.editorAttempts, 2);
  assert.equal(
    revisionReasons[1].some((reason) =>
      reason.includes(`${CHILD_NEWS_SUMMARY_LINE_MAX_LENGTH}자`),
    ),
    true,
  );
}

async function testReviewerFailClosedAndNoQuotaFill() {
  const target = article(
    "08",
    "삼성전자 영업이익 발표",
    ["삼성전자가 영업이익을 발표했다."],
  );
  const selection = accepted(target);
  let editorCalls = 0;
  const runRole: NewsRoleRunner = async (request) => {
    if (request.role === "headline_screener") return headlinePassed(target);
    if (request.role === "relevance_selector") return selection;
    if (request.role === "child_news_editor") {
      editorCalls += 1;
      return draft(target, "S1", {
        headline: { text: "삼성전자 영업이익 발표", sourceIds: ["S1"] },
        homeSummary: {
          text: "삼성전자가 영업이익을 발표했어요.",
          sourceIds: ["S1"],
        },
        body: [
          {
            role: "core_event",
            text: "삼성전자가 영업이익을 발표했어요.",
            sourceIds: ["S1"],
          },
          {
            role: "business_connection",
            text: "영업이익은 사업 운영 뒤 남은 돈이야.",
            sourceIds: ["S1"],
          },
          {
            role: "context",
            text: "발표한 회사는 삼성전자야.",
            sourceIds: ["S1"],
          },
        ],
      });
    }
    return approvedReview(target, {
      checks: {
        ...approvedReview(target).checks,
        focusAlignment: false,
      },
      issues: [
        {
          code: "SECONDARY_EVENT_DOMINATES",
          explanation: "주변 사건이 홈 요약을 차지했습니다.",
          sourceIds: ["S1"],
        },
      ],
    });
  };

  const result = await processNewsCandidate(target, { runRole, universe });
  assert.equal(result.status, "rejected");
  assert.equal(result.stage, "reviewer");
  assert.equal(editorCalls, 2);

  const batch = await runNewsPipeline([target], {
    runRole,
    universe,
    maxReady: 10,
  });
  assert.equal(batch.readyForStorage.length, 0);
  assert.equal(batch.rejected.length, 1);
  assert.equal(batch.unprocessedArticleIds.length, 0);
}

async function testMalformedOutputFailsClosed() {
  const target = article(
    "malformed",
    "삼성전자 실적 발표",
    ["삼성전자가 실적을 발표했다."],
  );
  const result = await processNewsCandidate(target, {
    universe,
    runRole: async (request) =>
      request.role === "headline_screener"
        ? headlinePassed(target)
        : { decision: "accept" },
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.stage, "selector");
  assert.equal(result.reasonCodes.includes("INVALID_ROLE_OUTPUT"), true);
}

async function testRequiredPrimaryStockStopsBeforeEditing() {
  const target = article(
    "target-mismatch",
    "SK하이닉스 실적 발표",
    ["SK하이닉스가 영업이익을 발표했다."],
  );
  let editorCalls = 0;
  const result = await processNewsCandidate(target, {
    universe,
    requiredPrimaryStockId: "KRX:005930",
    runRole: async (request) => {
      if (request.role === "headline_screener") return headlinePassed(target);
      if (request.role === "relevance_selector") {
        return accepted(target, {
          primaryStockIds: ["KRX:000660"],
          focusStatement: "SK하이닉스가 영업이익을 발표했다.",
        });
      }
      editorCalls += 1;
      return draft(target, "S1");
    },
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.stage, "selector");
  assert.deepEqual(result.reasonCodes, ["TARGET_STOCK_NOT_PRIMARY"]);
  assert.equal(editorCalls, 0);
}

async function main() {
  await testFocusIsolation();
  await testHeadlineScreenRejectsRoutineNews();
  await testSecondaryCompanyRejected();
  await testAllTermsAndRetry();
  await testFamiliarNumbersIgnoredAndExactTermReplacementAccepted();
  await testThreeLineSummaryAndKospiExplanation();
  await testSummaryLineLengthRetry();
  await testReviewerFailClosedAndNoQuotaFill();
  await testMalformedOutputFailsClosed();
  await testRequiredPrimaryStockStopsBeforeEditing();
  console.log("news role pipeline regression tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
