import type { FamilyMember } from "@/shared/types";

/**
 * 가족 거래 피드의 코멘트 게이트. 통합문서 v2.7 §11.4 · §21
 *
 * 부모가 자녀에게 남기는 코멘트만 검사한다. AI의 훈계를 막으면서 사람이 하는
 * 훈계를 방치하면 "안전한 투자 경험"이 챗봇 안에서만 성립한다. 아이가 야단맞는
 * 곳이 되면 다음 거래부터 근거 태깅을 방어적으로 쓰기 시작하고, 그 순간 성향
 * 분석 데이터가 함께 망가진다. 필터는 예의가 아니라 데이터 무결성 장치다.
 *
 * 검사기에 LLM을 쓰지 않는다 — 검사기도 환각하면 게이트가 아니다.
 */

export const COMMENT_MAX_LENGTH = 200;

type Rule = { pattern: RegExp; reason: CommentBlockReason };

export type CommentBlockReason =
  | "empty"
  | "too_long"
  | "recommendation"
  | "timing"
  | "scolding"
  | "grading";

const RULES: readonly Rule[] = [
  // 종목 추천·매매 지시
  { pattern: /(사라|팔아라|사야지|팔아야지|사둬|팔아버려|손절해|익절해|물타)/, reason: "recommendation" },
  { pattern: /(이거사|저거사|그거사|이거팔|저거팔|그거팔)/, reason: "recommendation" },
  { pattern: /(추천해|추천한다|추천할게|사는게좋|파는게좋)/, reason: "recommendation" },
  // 매매 시점·전망
  { pattern: /(지금사|지금팔|당장사|당장팔|내일사|내일팔)/, reason: "timing" },
  { pattern: /(오를거|내릴거|떨어질거|올라갈거|반등할|폭락할)/, reason: "timing" },
  { pattern: /(목표가|손절가|고점|저점)에?(맞춰|서팔|서사)/, reason: "timing" },
  // 훈계
  { pattern: /(그러니까내가|내가뭐랬|말을들어|말안들|하지말랬)/, reason: "scolding" },
  { pattern: /(한심|답답|바보|멍청|어이없|실망이)/, reason: "scolding" },
  { pattern: /(왜그랬어|왜샀어|왜팔았어)/, reason: "scolding" },
  // 성적 평가
  { pattern: /(못했|잘못했|틀렸어|실패했|망했)/, reason: "grading" },
  { pattern: /(몇점|점수는|등수|꼴찌|일등해)/, reason: "grading" },
];

export const COMMENT_BLOCK_MESSAGE: Record<CommentBlockReason, string> = {
  empty: "코멘트를 입력해 주세요.",
  too_long: `코멘트는 ${COMMENT_MAX_LENGTH}자까지 쓸 수 있어요.`,
  recommendation: "무엇을 사고팔지 정해 주는 말은 남길 수 없어요. 왜 그렇게 생각했는지 물어보는 건 어떨까요?",
  timing: "언제 사고팔지, 앞으로 오를지 내릴지는 남길 수 없어요. 지금 판단의 근거를 함께 이야기해 주세요.",
  scolding: "혼내는 말투는 아이가 다음 기록을 솔직하게 쓰지 않게 만들어요. 무엇이 궁금한지로 바꿔 볼까요?",
  grading: "잘잘못을 매기는 말 대신, 어떤 점이 인상 깊었는지 적어 주세요.",
};

export type CommentGateResult =
  | { ok: true; body: string }
  | { ok: false; reason: CommentBlockReason; message: string };

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function gateComment(options: {
  body: string;
  author: FamilyMember;
  target: FamilyMember;
}): CommentGateResult {
  const body = options.body.trim();
  if (!body) return { ok: false, reason: "empty", message: COMMENT_BLOCK_MESSAGE.empty };
  if (body.length > COMMENT_MAX_LENGTH) {
    return { ok: false, reason: "too_long", message: COMMENT_BLOCK_MESSAGE.too_long };
  }

  // 자녀가 부모에게 남기는 코멘트는 검사하지 않는다 (v2.7 §11.4).
  if (!(options.author === "parent" && options.target === "child")) {
    return { ok: true, body };
  }

  const normalized = normalize(body);
  const hit = RULES.find((rule) => rule.pattern.test(normalized));
  return hit
    ? { ok: false, reason: hit.reason, message: COMMENT_BLOCK_MESSAGE[hit.reason] }
    : { ok: true, body };
}
