import "server-only";

import { LLM_MODEL, getLlmClient } from "../../../../shared/llm/client";
import {
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
        items: {
          type: "object",
          additionalProperties: false,
          required: ["role", "text", "sourceIds"],
          properties: {
            role: { type: "string", enum: NEWS_BODY_ROLES },
            text: { type: "string" },
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

/** 서버 코드에서만 주입하는 기본 Responses API 역할 실행기다. */
export const runOpenAiNewsRole: NewsRoleRunner = async (request, signal) => {
  const client = getLlmClient();
  const { role, reasoningEffort, ...payload } = request;
  const response = await client.responses.create(
    {
      model: LLM_MODEL,
      reasoning: { effort: reasoningEffort },
      max_output_tokens:
        role === "headline_screener"
          ? 12_000
          : role === "child_news_editor"
            ? 6_000
            : 20_000,
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
    },
    { signal },
  );

  if (!response.output_text.trim()) {
    const incompleteReason = response.incomplete_details?.reason;
    throw new Error(
      `${role} returned an empty response${incompleteReason ? ` (${incompleteReason})` : ""}`,
    );
  }
  return JSON.parse(response.output_text) as unknown;
};
