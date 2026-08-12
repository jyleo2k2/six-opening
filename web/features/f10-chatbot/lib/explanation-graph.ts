import { CHATBOT_KNOWLEDGE, type ChatbotKnowledgeEntry } from "../../../shared/data/chatbot-knowledge";
import { STOCKS, type StockEducation } from "../../../shared/data/stocks";

export type GuidedTopicId = `term:${string}` | `stock:${string}`;
export type GuidedOptionId =
  | "simpler"
  | "example"
  | "detail"
  | "offerings"
  | "touchpoint"
  | "sector"
  | "understood";

export type ExplanationOption = {
  id: GuidedOptionId;
  label: string;
  targetNodeId: string | null;
};

export type ExplanationNode = {
  id: string;
  topicId: GuidedTopicId;
  text: string;
  options: ExplanationOption[];
};

const DONE: ExplanationOption = { id: "understood", label: "이해했어", targetNodeId: null };
const TERM_OPTIONS: ExplanationOption[] = [
  { id: "simpler", label: "더 쉽게", targetNodeId: "simpler" },
  { id: "example", label: "화면 예시", targetNodeId: "example" },
  { id: "detail", label: "다시 자세히", targetNodeId: "detail" },
  DONE,
];
const STOCK_OPTIONS: ExplanationOption[] = [
  { id: "offerings", label: "무엇을 만들어?", targetNodeId: "offerings" },
  { id: "touchpoint", label: "어디에서 만나?", targetNodeId: "touchpoint" },
  { id: "sector", label: "업종에서 하는 일", targetNodeId: "sector" },
  DONE,
];

function normalize(value: string) {
  return value.replaceAll(" ", "").toLowerCase();
}

function findTermInText(message: string) {
  const normalized = normalize(message);
  const matches = CHATBOT_KNOWLEDGE
    .filter((entry) => entry.kind === "glossary" && entry.status === "reviewed")
    .map((entry) => ({
      entry,
      aliases: entry.triggers.filter((trigger) => normalized.includes(normalize(trigger))).map(normalize),
    }))
    .filter(({ aliases }) => aliases.length > 0);
  if (matches.length > 1 && /와|과|및|그리고|,/.test(message)) return null;
  const scored = matches.map(({ entry, aliases }) => ({ entry, aliases, score: Math.max(...aliases.map((alias) => alias.length)) }));
  const bestScore = Math.max(...scored.map(({ score }) => score), 0);
  const best = scored.filter(({ score }) => score === bestScore);
  if (best.length !== 1) return null;
  return scored.every(({ entry, aliases }) =>
    entry === best[0].entry || aliases.every((alias) => best[0].aliases.some((bestAlias) => bestAlias.includes(alias))),
  )
    ? best[0].entry
    : null;
}

function findStockInText(message: string) {
  const normalized = normalize(message);
  const matches = STOCKS.map((stock) => ({
    stock,
    aliases: [stock.symbol, stock.name, ...stock.searchAliases].filter((alias) => normalized.includes(normalize(alias))).map(normalize),
  })).filter(({ aliases }) => aliases.length > 0);
  if (matches.length > 1 && /와|과|및|그리고|,/.test(message)) return null;
  const scored = matches.map(({ stock, aliases }) => ({ stock, aliases, score: Math.max(...aliases.map((alias) => alias.length)) }));
  const bestScore = Math.max(...scored.map(({ score }) => score), 0);
  const best = scored.filter(({ score }) => score === bestScore);
  if (best.length !== 1) return null;
  return scored.every(({ stock, aliases }) =>
    stock === best[0].stock || aliases.every((alias) => best[0].aliases.some((bestAlias) => bestAlias.includes(alias))),
  )
    ? best[0].stock
    : null;
}

function isStockQuestion(message: string) {
  return /회사|종목|뭐.?하|만들|어디.*만나|업종|산업/.test(message.replaceAll(" ", ""));
}

function getTopic(topicId: GuidedTopicId) {
  if (topicId.startsWith("term:")) {
    const id = topicId.slice("term:".length);
    const term = CHATBOT_KNOWLEDGE.find(
      (entry) => entry.kind === "glossary" && entry.status === "reviewed" && entry.id === id,
    );
    return term ? { kind: "term" as const, value: term } : null;
  }

  const id = topicId.slice("stock:".length);
  const stock = STOCKS.find((entry) => entry.id === id);
  return stock ? { kind: "stock" as const, value: stock } : null;
}

function termNode(topicId: GuidedTopicId, term: ChatbotKnowledgeEntry, nodeId: string): ExplanationNode | null {
  const label = term.triggers[0] ?? term.id;
  if (nodeId === "main") {
    return { text: `${term.answer} 어떤 방식으로 더 볼까?`, id: nodeId, topicId, options: TERM_OPTIONS };
  }
  if (nodeId === "simpler") {
    return {
      text: `쉽게 말하면, ${term.answer} 화면에서 ${label}이라는 말을 만나면 이 뜻을 떠올리면 돼.`,
      id: nodeId,
      topicId,
      options: [
        { id: "example", label: "화면 예시", targetNodeId: "example" },
        { id: "detail", label: "다시 자세히", targetNodeId: "detail" },
        DONE,
      ],
    };
  }
  if (nodeId === "example") {
    return {
      text: `예를 들어 화면에서 ${label} 항목을 보면, 그 숫자나 상태가 무엇을 뜻하는지 확인하는 데 쓰는 말이야. ${term.answer}`,
      id: nodeId,
      topicId,
      options: [
        { id: "detail", label: "다시 자세히", targetNodeId: "detail" },
        DONE,
      ],
    };
  }
  if (nodeId === "detail") {
    return { text: `${term.answer} 이 용어는 한 가지 숫자나 결과만으로 판단하기보다, 화면의 다른 정보와 함께 읽는 데 도움을 줘.`, id: nodeId, topicId, options: [DONE] };
  }
  return null;
}

function stockNode(topicId: GuidedTopicId, stock: StockEducation, nodeId: string): ExplanationNode | null {
  if (nodeId === "main") {
    return { text: `${stock.name}은(는) ${stock.companySummary} 무엇이 더 궁금해?`, id: nodeId, topicId, options: STOCK_OPTIONS };
  }
  if (nodeId === "offerings") {
    return { text: `${stock.name}은(는) ${stock.offerings.join(", ")} 같은 일을 해. 다음에는 어디에서 만나는지나 업종 역할도 볼까?`, id: nodeId, topicId, options: [
      { id: "touchpoint", label: "어디에서 만나?", targetNodeId: "touchpoint" },
      { id: "sector", label: "업종에서 하는 일", targetNodeId: "sector" },
      DONE,
    ] };
  }
  if (nodeId === "touchpoint") {
    return { text: `${stock.name}은(는) ${stock.everydayTouchpoints.join(", ")} 만날 수 있어. 만드는 것과 업종 역할도 이어서 볼 수 있어.`, id: nodeId, topicId, options: [
      { id: "offerings", label: "무엇을 만들어?", targetNodeId: "offerings" },
      { id: "sector", label: "업종에서 하는 일", targetNodeId: "sector" },
      DONE,
    ] };
  }
  if (nodeId === "sector") {
    return { text: `${stock.name}은(는) ${stock.sector} 업종에 속해 있어. ${stock.companySummary} 만드는 것과 일상에서 만나는 모습도 더 볼 수 있어.`, id: nodeId, topicId, options: [
      { id: "offerings", label: "무엇을 만들어?", targetNodeId: "offerings" },
      { id: "touchpoint", label: "어디에서 만나?", targetNodeId: "touchpoint" },
      DONE,
    ] };
  }
  return null;
}

export function findGuidedTopic(message: string, contextStockName?: string): GuidedTopicId | null {
  const stock = findStockInText(message);
  if (stock) return `stock:${stock.id}`;

  const term = findTermInText(message);
  if (term) return `term:${term.id}`;

  if (contextStockName && isStockQuestion(message)) {
    const contextStock = findStockInText(contextStockName);
    if (contextStock) return `stock:${contextStock.id}`;
  }

  return null;
}

export function getExplanationNode(topicId: GuidedTopicId, nodeId: string) {
  const topic = getTopic(topicId);
  if (!topic) return null;
  return topic.kind === "term"
    ? termNode(topicId, topic.value, nodeId)
    : stockNode(topicId, topic.value, nodeId);
}

export function isGuidedTopicId(value: unknown): value is GuidedTopicId {
  return typeof value === "string" && getTopic(value as GuidedTopicId) !== null;
}

export function isGuidedOptionId(value: unknown): value is GuidedOptionId {
  return ["simpler", "example", "detail", "offerings", "touchpoint", "sector", "understood"].includes(String(value));
}
