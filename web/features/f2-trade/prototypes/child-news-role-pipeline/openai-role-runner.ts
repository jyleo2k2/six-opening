import "server-only";

import { LLM_MODEL, getLlmClient } from "../../../../shared/llm/client";
import {
  CHILD_NEWS_SUMMARY_LINE_COUNT,
  CHILD_NEWS_SUMMARY_LINE_MAX_LENGTH,
  MATERIAL_EVENT_TYPES,
  NEWS_BODY_ROLES,
  REVIEW_CHECK_NAMES,
  SELECTOR_REJECT_CODES,
  type NewsRole,
  type NewsRoleRunner,
} from "./contracts";
import { NEWS_ROLE_PROMPTS } from "./prompts";

const stringArray = {
  type: "array",
  items: { type: "string" },
} as const;

const citedTextSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "sourceIds"],
  properties: {
    text: { type: "string" },
    sourceIds: stringArray,
  },
} as const;

const ROLE_SCHEMAS: Record<NewsRole, Record<string, unknown>> = {
  headline_screener: {
    type: "object",
    additionalProperties: false,
    required: ["articleId", "decision", "reasonCodes", "reasons"],
    properties: {
      articleId: { type: "string" },
      decision: { type: "string", enum: ["pass", "reject"] },
      reasonCodes: {
        type: "array",
        items: { type: "string", enum: SELECTOR_REJECT_CODES },
      },
      reasons: stringArray,
    },
  },
  relevance_selector: {
    type: "object",
    additionalProperties: false,
    required: [
      "articleId",
      "decision",
      "kind",
      "primaryStockIds",
      "eventType",
      "focusStatement",
      "anchorSourceId",
      "includedSourceIds",
      "excludedSourceIds",
      "difficultTerms",
      "reasonCodes",
      "reasons",
    ],
    properties: {
      articleId: { type: "string" },
      decision: { type: "string", enum: ["accept", "reject"] },
      kind: { type: "string", enum: ["market", "company", "ineligible"] },
      primaryStockIds: stringArray,
      eventType: {
        type: "string",
        enum: [...MATERIAL_EVENT_TYPES, "none"],
      },
      focusStatement: { type: "string" },
      anchorSourceId: { type: "string" },
      includedSourceIds: stringArray,
      excludedSourceIds: stringArray,
      difficultTerms: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["term", "sourceIds"],
          properties: {
            term: { type: "string" },
            sourceIds: stringArray,
          },
        },
      },
      reasonCodes: {
        type: "array",
        items: { type: "string", enum: SELECTOR_REJECT_CODES },
      },
      reasons: stringArray,
    },
  },
  child_news_editor: {
    type: "object",
    additionalProperties: false,
    required: [
      "articleId",
      "headline",
      "homeSummary",
      "body",
      "termTreatments",
    ],
    properties: {
      articleId: { type: "string" },
      headline: citedTextSchema,
      homeSummary: citedTextSchema,
      body: {
        type: "array",
        minItems: CHILD_NEWS_SUMMARY_LINE_COUNT,
        maxItems: CHILD_NEWS_SUMMARY_LINE_COUNT,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["role", "text", "sourceIds"],
          properties: {
            role: { type: "string", enum: NEWS_BODY_ROLES },
            text: {
              type: "string",
              minLength: 1,
              maxLength: CHILD_NEWS_SUMMARY_LINE_MAX_LENGTH,
            },
            sourceIds: stringArray,
          },
        },
      },
      termTreatments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["term", "treatment", "easyText"],
          properties: {
            term: { type: "string" },
            treatment: { type: "string", enum: ["replaced", "explained"] },
            easyText: { type: "string" },
          },
        },
      },
    },
  },
  publication_reviewer: {
    type: "object",
    additionalProperties: false,
    required: [
      "articleId",
      "independentKind",
      "primaryStockIds",
      "eventType",
      "focusStatement",
      "anchorSourceIds",
      "checks",
      "issues",
    ],
    properties: {
      articleId: { type: "string" },
      independentKind: {
        type: "string",
        enum: ["market", "company", "ineligible"],
      },
      primaryStockIds: stringArray,
      eventType: {
        type: "string",
        enum: [...MATERIAL_EVENT_TYPES, "none"],
      },
      focusStatement: { type: "string" },
      anchorSourceIds: stringArray,
      checks: {
        type: "object",
        additionalProperties: false,
        required: REVIEW_CHECK_NAMES,
        properties: Object.fromEntries(
          REVIEW_CHECK_NAMES.map((name) => [name, { type: "boolean" }]),
        ),
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["code", "explanation", "sourceIds"],
          properties: {
            code: { type: "string" },
            explanation: { type: "string" },
            sourceIds: stringArray,
          },
        },
      },
    },
  },
};

export const NEWS_ROLE_OUTPUT_TOKEN_BUDGET: Record<NewsRole, number> = {
  headline_screener: 32_000,
  relevance_selector: 48_000,
  child_news_editor: 32_000,
  publication_reviewer: 48_000,
};

const MAX_OUTPUT_TOKEN_RETRY_BUDGET = 64_000;

/** 서버 코드에서만 주입하는 기본 Responses API 역할 실행기다. */
export const runOpenAiNewsRole: NewsRoleRunner = async (request, signal) => {
  const client = getLlmClient();
  const { role, reasoningEffort, ...payload } = request;
  const createResponse = (maxOutputTokens: number) =>
    client.responses.create({
      model: LLM_MODEL,
      reasoning: { effort: reasoningEffort },
      max_output_tokens: maxOutputTokens,
      instructions: NEWS_ROLE_PROMPTS[role],
      input: JSON.stringify(payload),
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: `child_news_${role}`,
          strict: true,
          schema: ROLE_SCHEMAS[role],
        },
      },
    }, { signal });

  let response = await createResponse(NEWS_ROLE_OUTPUT_TOKEN_BUDGET[role]);
  if (
    response.status === "incomplete" &&
    response.incomplete_details?.reason === "max_output_tokens" &&
    !signal.aborted
  ) {
    response = await createResponse(MAX_OUTPUT_TOKEN_RETRY_BUDGET);
  }

  if (response.status === "incomplete" || !response.output_text.trim()) {
    const incompleteReason = response.incomplete_details?.reason;
    throw new Error(
      `${role} returned an incomplete response${incompleteReason ? ` (${incompleteReason})` : ""}`,
    );
  }
  return JSON.parse(response.output_text) as unknown;
};
