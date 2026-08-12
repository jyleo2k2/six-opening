import { STOCKS } from "../../../shared/data/stocks";
import {
  type StockExploreReply,
  type StockExploreTurn,
  type StockFactTopic,
} from "../../../shared/types/chatbot";

export const STOCK_EXPLORE_TOPICS = [
  "company",
  "business",
  "industry",
] as const satisfies readonly StockFactTopic[];

export type StockExploreStep =
  | {
      kind: "topic";
      stockId: `KRX:${string}`;
      topic: StockFactTopic;
      shownTopics: StockFactTopic[];
    }
  | { kind: "end"; text: string };

const TOPIC_QUESTIONS: Record<
  StockFactTopic,
  (stockName: string) => string
> = {
  company: (stockName) => `${stockName}, 무슨 회사야?`,
  business: (stockName) => `${stockName}, 어떻게 돈을 벌어?`,
  industry: (stockName) => `${stockName}, 업종에서 어떤 역할을 해?`,
  financial: (stockName) => `${stockName}, 2024년 실적도 알려줘`,
};

const TOPIC_FEEDBACK: Record<StockFactTopic, string> = {
  company: "궁금한 회사를 잘 짚었어",
  business: "돈을 버는 방식이 궁금했구나",
  industry: "업종에서 맡는 역할도 잘 물어봤어",
  financial: "과거 실적까지 확인해 보려는 거구나",
};

function findStock(stockId: string) {
  return STOCKS.find((stock) => stock.id === stockId);
}

export function findNextStockExploreTopic(
  shownTopics: readonly StockFactTopic[],
) {
  if (shownTopics.includes("financial")) return undefined;
  return STOCK_EXPLORE_TOPICS.find((topic) => !shownTopics.includes(topic));
}

export function startStockExplore(
  stockId: `KRX:${string}`,
  topic: StockFactTopic,
): StockExploreStep | null {
  if (!findStock(stockId)) return null;
  return { kind: "topic", stockId, topic, shownTopics: [topic] };
}

export function advanceStockExplore(
  reply: StockExploreReply,
): StockExploreStep | null {
  if (!findStock(reply.stockId)) return null;

  const nextTopic = findNextStockExploreTopic(reply.shownTopics);
  if (reply.choiceId === "done") {
    return { kind: "end", text: "좋아, 여기까지 볼게. 궁금한 종목이 생기면 이름을 말해 줘." };
  }
  if (reply.choiceId === "ask-other") {
    return nextTopic
      ? null
      : { kind: "end", text: "좋아, 다른 종목 이름과 궁금한 점을 적어 줄래?" };
  }
  if (reply.choiceId !== nextTopic) return null;
  return {
    kind: "topic",
    stockId: reply.stockId,
    topic: reply.choiceId,
    shownTopics: [...reply.shownTopics, reply.choiceId],
  };
}

export function createStockExploreTurn(
  stockId: `KRX:${string}`,
  shownTopics: readonly StockFactTopic[],
): StockExploreTurn | null {
  const stock = findStock(stockId);
  if (!stock) return null;

  const nextTopic = findNextStockExploreTopic(shownTopics);
  if (nextTopic) {
    return {
      stockId,
      shownTopics,
      prompt: "이것도 알려줄까?",
      choices: [
        { id: nextTopic, label: TOPIC_QUESTIONS[nextTopic](stock.name) },
        { id: "done", label: "여기까지 볼래" },
      ],
    };
  }

  return {
    stockId,
    shownTopics,
    prompt: shownTopics.includes("financial")
      ? `${stock.name}의 2024년 실적을 살펴봤어. 다른 종목도 알아볼까?`
      : `${stock.name}의 회사·사업·업종 정보는 모두 살펴봤어. 다른 종목도 알아볼까?`,
    choices: [
      { id: "ask-other", label: "다른 종목 물어볼래" },
      { id: "done", label: "여기까지 볼래" },
    ],
  };
}

export function formatStockFactAnswer(
  topic: StockFactTopic,
  fact: string,
) {
  return `${TOPIC_FEEDBACK[topic]} — ${fact}`;
}
