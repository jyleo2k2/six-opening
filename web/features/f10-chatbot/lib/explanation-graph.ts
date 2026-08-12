import { CHATBOT_KNOWLEDGE, type ChatbotKnowledgeEntry } from "../../../shared/data/chatbot-knowledge";
import { SECTORS } from "../../../shared/data/sectors";
import { STOCKS, type StockEducation } from "../../../shared/data/stocks";

export type GuidedTopicId = `term:${string}` | `stock:${string}`;
export type GuidedNodeId = "main" | "related" | "offerings" | "touchpoint" | "sector";

export type GuidedSection = {
  id: GuidedNodeId | `related:${string}`;
  keyword: string;
  text: string;
};

const TERM_RELATIONS: Record<string, readonly string[]> = {
  stock: ["shareholder", "stock-item"], shareholder: ["stock", "dividend"], "stock-item": ["stock", "sector"],
  buy: ["order", "quantity"], sell: ["order", "realized-profit"], order: ["buy", "sell"], execution: ["order", "quantity"],
  "current-price": ["chart", "volatility"], "market-order": ["limit-order", "execution"], "limit-order": ["market-order", "execution"], quantity: ["estimated-amount", "order"],
  "estimated-amount": ["quantity", "market-order"], "evaluation-amount": ["unrealized-profit", "current-price"], "unrealized-profit": ["evaluation-amount", "realized-profit"],
  "realized-profit": ["unrealized-profit", "sell"], return: ["unrealized-profit", "risk"], "average-price": ["unrealized-profit", "buy"],
  sector: ["stock-item", "diversification"], "market-cap": ["stock", "current-price"], revenue: ["operating-profit", "eps"], "operating-profit": ["revenue", "eps"],
  dividend: ["shareholder", "stock"], per: ["eps", "pbr"], pbr: ["per", "market-cap"], eps: ["per", "operating-profit"], etf: ["diversification", "index"],
  index: ["etf", "chart"], diversification: ["etf", "risk"], chart: ["current-price", "volatility"], volume: ["execution", "chart"], volatility: ["chart", "risk"], risk: ["diversification", "return"],
};

function normalize(value: string) {
  return value.replaceAll(" ", "").toLowerCase();
}

function findTermInText(message: string) {
  const normalized = normalize(message);
  const matches = CHATBOT_KNOWLEDGE
    .filter((entry) => entry.kind === "glossary" && entry.status === "reviewed")
    .map((entry) => ({ entry, aliases: entry.triggers.filter((trigger) => normalized.includes(normalize(trigger))).map(normalize) }))
    .filter(({ aliases }) => aliases.length > 0);
  if (matches.length > 1 && /와|과|및|그리고|,/.test(message)) return null;
  const best = matches.sort((a, b) => Math.max(...b.aliases.map((alias) => alias.length)) - Math.max(...a.aliases.map((alias) => alias.length)))[0];
  return best && matches.filter(({ aliases }) => Math.max(...aliases.map((alias) => alias.length)) === Math.max(...best.aliases.map((alias) => alias.length))).length === 1 ? best.entry : null;
}

function findStockInText(message: string) {
  const normalized = normalize(message);
  const matches = STOCKS.map((stock) => ({ stock, aliases: [stock.symbol, stock.name, ...stock.searchAliases].filter((alias) => normalized.includes(normalize(alias))).map(normalize) })).filter(({ aliases }) => aliases.length > 0);
  if (matches.length > 1 && /와|과|및|그리고|,/.test(message)) return null;
  const best = matches.sort((a, b) => Math.max(...b.aliases.map((alias) => alias.length)) - Math.max(...a.aliases.map((alias) => alias.length)))[0];
  return best && matches.filter(({ aliases }) => Math.max(...aliases.map((alias) => alias.length)) === Math.max(...best.aliases.map((alias) => alias.length))).length === 1 ? best.stock : null;
}

function isStockQuestion(message: string) {
  return /회사|종목|뭐.?하|만들|어디.*만나|업종|산업/.test(message.replaceAll(" ", ""));
}

function getTopic(topicId: GuidedTopicId) {
  if (topicId.startsWith("term:")) {
    const term = CHATBOT_KNOWLEDGE.find((entry) => entry.kind === "glossary" && entry.status === "reviewed" && entry.id === topicId.slice(5));
    return term ? { kind: "term" as const, value: term } : null;
  }
  const stock = STOCKS.find((entry) => entry.id === topicId.slice(6));
  return stock ? { kind: "stock" as const, value: stock } : null;
}

function termSections(term: ChatbotKnowledgeEntry): GuidedSection[] {
  const related = TERM_RELATIONS[term.id] ?? [];
  return [
    { id: "main", keyword: term.triggers[0] ?? term.id, text: term.answer },
    ...related.flatMap((id) => {
      const entry = CHATBOT_KNOWLEDGE.find((candidate) => candidate.id === id && candidate.kind === "glossary" && candidate.status === "reviewed");
      return entry ? [{ id: `related:${entry.id}` as const, keyword: entry.triggers[0] ?? entry.id, text: entry.answer }] : [];
    }),
  ];
}

function stockSections(stock: StockEducation): GuidedSection[] {
  const sector = SECTORS.find((entry) => entry.key === stock.sector);
  return [
    { id: "main", keyword: stock.name, text: `${stock.name}은(는) ${stock.companySummary}` },
    { id: "offerings", keyword: "제공 제품·서비스", text: `${stock.name}은(는) ${stock.offerings.join(", ")} 같은 일을 해.` },
    { id: "touchpoint", keyword: "일상에서 만나는 모습", text: `${stock.name}은(는) ${stock.everydayTouchpoints.join(", ")} 만날 수 있어.` },
    { id: "sector", keyword: "업종에서 하는 일", text: `${stock.name}은(는) ${sector?.label ?? stock.sector} 업종에 속해 있어. ${sector?.summary ?? stock.companySummary}` },
  ];
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

export function getGuidedSections(topicId: GuidedTopicId) {
  const topic = getTopic(topicId);
  if (!topic) return null;
  return topic.kind === "term" ? termSections(topic.value) : stockSections(topic.value);
}

export function isGuidedTopicId(value: unknown): value is GuidedTopicId {
  return typeof value === "string" && getTopic(value as GuidedTopicId) !== null;
}
