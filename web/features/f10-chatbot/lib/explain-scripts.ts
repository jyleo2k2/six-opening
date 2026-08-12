import { CHATBOT_KNOWLEDGE } from "../../../shared/data/chatbot-knowledge";
import type { ExplainScript } from "../../../shared/types/chatbot";

/**
 * 4단계 설명 스크립트. 사전 저작·검수된 정적 데이터이며 런타임 생성하지 않는다.
 *
 * 대상 기준은 DAPIE §4.2.3 — "낯선 용어"와 "복잡한 인과관계"뿐이다.
 * `주식`·`매수`·`수량`처럼 한 문장이면 끝나는 용어는 넣지 않는다. 매 턴 퀴즈를 내면
 * 아이가 지친다는 실패 사례가 논문 §7.2에 기록돼 있다.
 */
const SCRIPTS: readonly (ExplainScript & { extraTriggers?: readonly string[] })[] = [
  {
    id: "term:per",
    extraTriggers: ["퍼", "비싼지", "싼지", "비싼회사"],
    brief: "PER은 회사 값이 버는 돈에 비해 높은지 보는 숫자야.",
    check: {
      question: "PER이 크면 회사 값은 버는 돈에 비해 어떨까?",
      choices: [
        { id: "high", label: "높은 편이야" },
        { id: "low", label: "낮은 편이야" },
        { id: "none", label: "상관없어" },
      ],
      answerId: "high",
    },
    detail:
      "PER은 회사 전체 값을 한 해에 버는 돈으로 나눈 값이야. 그래서 숫자가 클수록 버는 돈에 비해 값이 높다는 뜻이야.",
    example:
      "한 해에 같은 돈을 버는 가게가 두 곳 있다고 해 보자. 한 곳이 다른 곳보다 두 배 비싸면 그 가게의 PER이 더 커.",
  },
  {
    id: "term:pbr",
    extraTriggers: ["재산에비해"],
    brief: "PBR은 회사 값이 회사가 가진 재산에 비해 높은지 보는 숫자야.",
    check: {
      question: "PBR은 회사 값을 무엇과 비교할까?",
      choices: [
        { id: "asset", label: "회사가 가진 재산" },
        { id: "staff", label: "직원 수" },
        { id: "age", label: "회사 나이" },
      ],
      answerId: "asset",
    },
    detail:
      "PBR은 회사 전체 값을 회사가 가진 재산으로 나눈 값이야. 재산에는 건물과 기계, 남아 있는 돈이 함께 들어가.",
    example:
      "가진 물건이 똑같은 가게가 두 곳 있다고 해 보자. 한 곳이 세 배 비싸면 그 가게의 PBR이 더 커.",
  },
  {
    id: "term:eps",
    extraTriggers: ["한주당", "조각하나가"],
    brief: "EPS는 회사가 번 돈을 주식 한 조각 몫으로 나눈 값이야.",
    check: {
      question: "EPS는 회사가 번 돈을 무엇으로 나눌까?",
      choices: [
        { id: "shares", label: "전체 주식 수" },
        { id: "staff", label: "직원 수" },
        { id: "stores", label: "가게 수" },
      ],
      answerId: "shares",
    },
    detail:
      "회사가 한 해에 번 돈을 전체 주식 수로 나누면 EPS가 나와. 조각 하나가 얼마씩 벌었는지 보는 숫자야.",
    example:
      "피자 한 판을 여덟 조각으로 나누면 한 조각 몫이 정해지지. EPS도 번 돈을 조각 수로 나눈 몫이야.",
  },
  {
    id: "term:market-order",
    extraTriggers: ["바로사는", "바로주문"],
    brief: "시장가는 지금 시장에 나와 있는 값으로 바로 주문하는 방법이야.",
    check: {
      question: "시장가 주문은 값을 누가 정할까?",
      choices: [
        { id: "market", label: "지금 시장" },
        { id: "me", label: "내가 직접" },
        { id: "bear", label: "키웅이" },
      ],
      answerId: "market",
    },
    detail:
      "시장가는 내가 값을 정하지 않고 지금 시장에 나와 있는 값을 그대로 받아. 그래서 주문을 넣는 순간과 조금 달라질 수 있어.",
    example:
      "가게에 붙은 값표를 그대로 보고 고르는 것과 비슷해. 값을 깎지 않는 대신 기다리지 않아도 돼.",
  },
  {
    id: "term:limit-order",
    extraTriggers: ["내가정한값", "원하는값"],
    brief: "지정가는 내가 정한 값에만 주문이 되도록 하는 방법이야.",
    check: {
      question: "지정가 주문은 값을 누가 정할까?",
      choices: [
        { id: "me", label: "내가 직접" },
        { id: "market", label: "지금 시장" },
        { id: "company", label: "회사" },
      ],
      answerId: "me",
    },
    detail:
      "지정가는 내가 원하는 값을 미리 적어 두는 방법이야. 그 값에 거래할 상대가 없으면 주문이 바로 끝나지 않아.",
    example:
      "친구에게 이만큼이면 바꾸겠다고 미리 말해 두는 것과 비슷해. 친구가 동의해야 바꿀 수 있어.",
  },
  {
    id: "term:unrealized-profit",
    extraTriggers: ["아직안판", "안팔았을때"],
    brief: "평가손익은 아직 팔지 않은 주식의 값이 얼마나 달라졌는지 보여줘.",
    check: {
      question: "평가손익은 언제 볼 수 있을까?",
      choices: [
        { id: "holding", label: "아직 가지고 있을 때" },
        { id: "after", label: "팔고 난 뒤에" },
        { id: "first", label: "처음 살 때만" },
      ],
      answerId: "holding",
    },
    detail:
      "평가손익은 지금 가진 주식을 오늘 값으로 계산한 결과야. 아직 거래가 끝나지 않아서 숫자가 계속 바뀌어.",
    example:
      "서랍에 넣어 둔 카드의 요즘 값을 적어 둔 쪽지와 비슷해. 아직 바꾸지 않았으니 숫자는 계속 달라져.",
  },
  {
    id: "term:realized-profit",
    extraTriggers: ["팔고나서", "거래끝난뒤"],
    brief: "실현손익은 주식을 팔아서 거래가 끝난 뒤에 남는 결과야.",
    check: {
      question: "실현손익은 언제 정해질까?",
      choices: [
        { id: "after", label: "팔고 난 뒤에" },
        { id: "holding", label: "아직 가지고 있을 때" },
        { id: "order", label: "주문을 넣을 때" },
      ],
      answerId: "after",
    },
    detail:
      "실현손익은 거래가 이미 끝나서 더 이상 바뀌지 않아. 평가손익과 달리 지나간 기록이야.",
    example:
      "친구와 카드를 바꾸고 나서 적어 둔 결과표와 비슷해. 바꾼 뒤에는 숫자가 그대로 남아.",
  },
  {
    id: "term:diversification",
    extraTriggers: ["나눠서", "여러곳에"],
    brief: "분산투자는 한 곳에 몰아 두지 않고 여러 곳에 나눠 두는 방법이야.",
    check: {
      question: "여러 곳에 나눠 두면 무엇이 달라질까?",
      choices: [
        { id: "steady", label: "한 곳이 나빠져도 덜 흔들려" },
        { id: "always", label: "언제나 돈이 늘어나" },
        { id: "free", label: "수수료가 사라져" },
      ],
      answerId: "steady",
    },
    detail:
      "여러 곳에 나눠 두면 한 곳이 나빠져도 전체가 한꺼번에 흔들리지 않아. 대신 한 곳이 아주 잘돼도 전체는 그만큼 크게 달라지지 않아.",
    example:
      "달걀을 한 바구니에 다 담지 않는 것과 같아. 바구니 하나를 떨어뜨려도 남은 달걀은 무사해.",
  },
];

export const EXPLAIN_SCRIPTS: readonly ExplainScript[] = SCRIPTS;

function normalize(value: string) {
  return value.replaceAll(" ", "").toLowerCase();
}

/** 스크립트 id에 대응하는 용어 사전 항목의 트리거 + 스크립트 고유 트리거. */
function triggersFor(script: (typeof SCRIPTS)[number]) {
  const termId = script.id.startsWith("term:") ? script.id.slice(5) : null;
  const entry = termId
    ? CHATBOT_KNOWLEDGE.find(
        (candidate) =>
          candidate.id === termId &&
          candidate.kind === "glossary" &&
          candidate.status === "reviewed",
      )
    : undefined;
  return [...(entry?.triggers ?? []), ...(script.extraTriggers ?? [])].map(
    normalize,
  );
}

export function getExplainScript(id: string): ExplainScript | null {
  return SCRIPTS.find((script) => script.id === id) ?? null;
}

/**
 * 질문에서 4단계 스크립트를 찾는다. 가장 긴 트리거가 이기고,
 * 여러 주제를 함께 묻는 문장("A와 B는 뭐야?")은 넘기지 않는다.
 */
export function findExplainScript(message: string): ExplainScript | null {
  if (/와|과|및|그리고|,/.test(message)) return null;
  const normalized = normalize(message);

  const matches = SCRIPTS.map((script) => ({
    script,
    length: Math.max(
      0,
      ...triggersFor(script)
        .filter((trigger) => normalized.includes(trigger))
        .map((trigger) => trigger.length),
    ),
  })).filter(({ length }) => length > 0);

  if (matches.length === 0) return null;
  const best = Math.max(...matches.map(({ length }) => length));
  const winners = matches.filter(({ length }) => length === best);
  return winners.length === 1 ? winners[0].script : null;
}
