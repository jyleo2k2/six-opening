// 기획안 7장 안전장치 + 3-5 reward hacking 방지를 코드로 옮긴 것.
// 라우트 핸들러는 여기만 호출한다. 로직이 흩어지면 규칙이 조용히 깨진다.

import type { Proposal, ProposalStatus } from './types'

export type Check = { ok: true } | { ok: false; error: string }

const ok: Check = { ok: true }
const no = (error: string): Check => ({ ok: false, error })

/** 최소 보유 90일 → 매도 제안 불가 */
export const MIN_HOLD_DAYS = 90
/** 제안서 유효기간 7일 */
export const PROPOSAL_TTL_DAYS = 7
/** Q2 보유기간 하한. 90일 규칙과 맞춘다 — "1개월 이내" 선택지를 두지 않는다 */
export const MIN_HOLD_MONTHS = 3
/** 월 한도. 용돈 수준으로 제한한다 */
export const MONTHLY_LIMIT = 300_000

const DAY_MS = 86_400_000

export function expiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + PROPOSAL_TTL_DAYS * DAY_MS)
}

export function isExpired(
  p: Pick<Proposal, 'status' | 'expiresAt'>,
  now = new Date(),
): boolean {
  return p.status === 'pending' && new Date(p.expiresAt) <= now
}

/** 반려 사유 필수. "그냥 안 돼"를 막는 것이 이 서비스의 학습 장치다 */
export function checkReason(reason: unknown): Check {
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return no('사유를 한 줄이라도 남겨 주세요')
  }
  return ok
}

/** 아이 원문 필수. 버튼 라벨만 남으면 데이터 전략이 무너진다 */
export function checkText(text: unknown): Check {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return no('왜 사고 싶은지 적어 주세요')
  }
  return ok
}

export function checkHoldMonths(months: unknown): Check {
  if (typeof months !== 'number' || !Number.isFinite(months)) {
    return no('보유 기간을 골라 주세요')
  }
  if (months < MIN_HOLD_MONTHS) {
    return no(`보유 기간은 ${MIN_HOLD_MONTHS}개월 이상이어야 해요`)
  }
  return ok
}

/** 월 한도. 이번 달 승인·체결된 금액 + 이번 제안이 한도를 넘으면 막는다 */
export function checkMonthlyLimit(spentThisMonth: number, amount: unknown): Check {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return no('목표 금액을 골라 주세요')
  }
  if (spentThisMonth + amount > MONTHLY_LIMIT) {
    const left = Math.max(0, MONTHLY_LIMIT - spentThisMonth)
    return no(`이번 달 남은 한도는 ${left.toLocaleString('ko-KR')}원이에요`)
  }
  return ok
}

/** 매도는 보유 중인 종목만 */
export function checkHasHolding(qty: number | undefined): Check {
  if (!qty || qty <= 0) return no('가지고 있지 않은 종목이에요')
  return ok
}

/** 매수 후 90일 이내 매도 제안 차단 */
export function checkSell(boughtAt: string, now = new Date()): Check {
  const held = (now.getTime() - new Date(boughtAt).getTime()) / DAY_MS
  if (held < MIN_HOLD_DAYS) {
    const left = Math.ceil(MIN_HOLD_DAYS - held)
    return no(`아직 ${left}일 더 가지고 있어야 해요`)
  }
  return ok
}

/** 부모가 응답할 수 있는 상태인가 */
export function checkRespondable(
  p: Pick<Proposal, 'status' | 'expiresAt'>,
  now = new Date(),
): Check {
  if (isExpired(p, now)) return no('기한이 지난 제안서예요')
  if (p.status !== 'pending') return no(`이미 처리된 제안서예요 (${p.status})`)
  return ok
}

/** 체결 가능한 상태인가 */
export function checkExecutable(status: ProposalStatus): Check {
  if (status !== 'approved') return no(`승인된 제안서만 체결할 수 있어요 (${status})`)
  return ok
}

/** 기획안 6-3 위험 룰 3개. 부모에게 알림만 보내고 차단하지는 않는다 */
export function riskAlerts(
  history: Pick<Proposal, 'stockCode' | 'status' | 'createdAt'>[],
  incoming: Pick<Proposal, 'stockCode'>,
  now = new Date(),
): string[] {
  const alerts: string[] = []
  const since = (d: string) => (now.getTime() - new Date(d).getTime()) / DAY_MS

  const rejectedRecently = history.some(
    (h) =>
      h.stockCode === incoming.stockCode &&
      h.status === 'rejected' &&
      since(h.createdAt) < 1,
  )
  if (rejectedRecently) {
    alerts.push('반려된 종목을 하루 안에 다시 제안했어요. 감정적 반응일 수 있어요.')
  }

  const repeats = history.filter(
    (h) => h.stockCode === incoming.stockCode && since(h.createdAt) <= 30,
  ).length
  if (repeats >= 3) {
    alerts.push('같은 종목을 30일 안에 3번 이상 제안했어요.')
  }

  return alerts
}
