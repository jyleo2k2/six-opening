// 프론트·백엔드 공유 계약. 이 파일이 곧 API 스펙이다.
// 프론트는 여기서 타입을 import한다 — 응답 모양을 바꾸면 tsc가 프론트를 깨뜨린다.

export type ProposalKind = 'buy' | 'sell'

/** pending → approved → executed | pending → rejected | pending → expired(7일) */
export type ProposalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'expired'

/** 제안 이유 분류. 버튼 선택 또는 자유서술 사후 분류(기획안 6-3) */
export type ReasonLabel =
  | '성장형'
  | '제품경험형'
  | '뉴스형'
  | '숫자형'
  | '외부추종형'
  | '자유'

/** 화이트리스트 종목 + 검수 카피 3줄(기획안 6-1) */
export interface Stock {
  code: string
  name: string
  /** ① 뭐 하는 회사인가 — 사전 검수된 고정문 */
  line1: string
  /** ② 네 일상 어디에 있나 — 사전 검수된 고정문 */
  line2: string
  /** 1주 가격(원). ③번 줄은 이 값으로 런타임 계산한다 */
  price: number
}

export interface Proposal {
  id: number
  childId: string
  kind: ProposalKind
  stockCode: string
  /** Q1 분류 라벨 */
  label: ReasonLabel
  /** Q1 아이 원문. 이게 없으면 데이터로서 가치가 없다(기획안 8장) */
  text: string
  /** 코치 되묻기 답변. "몰라"로 넘어가면 null */
  coachAnswer: string | null
  /** Q2 보유 예정 개월. 90일 미만 불가(기획안 7장) */
  holdMonths: number
  /** Q3 목표 금액(원) */
  targetAmount: number
  status: ProposalStatus
  createdAt: string
  expiresAt: string
}

export interface ParentResponse {
  proposalId: number
  approved: boolean
  /** 승인·반려 사유. 빈 문자열 불가 — 서버가 422(기획안 3-5) */
  reason: string
  respondedAt: string
}

export interface Execution {
  proposalId: number
  orderNo: string
  filledPrice: number
  filledQty: number
  executedAt: string
}

/** 코치 되묻기 1회 */
export interface CoachRequest {
  stockName: string
  label: ReasonLabel
  text: string
}
export interface CoachResponse {
  question: string
}

export interface ApiError {
  error: string
}
