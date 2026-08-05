// node --test lib/rules.test.ts  (Node 24: .ts 직접 실행)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkExecutable,
  checkHasHolding,
  checkHoldMonths,
  checkMonthlyLimit,
  checkReason,
  checkRespondable,
  checkSell,
  checkText,
  expiresAt,
  isExpired,
  MONTHLY_LIMIT,
  riskAlerts,
} from './rules.ts'

const DAY = 86_400_000
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString()

test('반려 사유는 필수 — 공백만으로는 통과 못 한다', () => {
  assert.equal(checkReason('지금은 시장이 불안정해서').ok, true)
  assert.equal(checkReason('   ').ok, false)
  assert.equal(checkReason('').ok, false)
  assert.equal(checkReason(undefined).ok, false)
})

test('아이 원문은 필수 — 라벨만 남으면 데이터가 죽는다', () => {
  assert.equal(checkText('반도체 뉴스가 많이 나와서').ok, true)
  assert.equal(checkText('').ok, false)
})

test('보유기간 하한 3개월 — "1개월 이내"는 선택될 수 없다', () => {
  assert.equal(checkHoldMonths(1).ok, false)
  assert.equal(checkHoldMonths(3).ok, true)
  assert.equal(checkHoldMonths(12).ok, true)
  assert.equal(checkHoldMonths('6' as unknown).ok, false)
})

test('최소 보유 90일 — 그 전에는 매도 제안이 막힌다', () => {
  assert.equal(checkSell(ago(89)).ok, false)
  assert.equal(checkSell(ago(91)).ok, true)
})

test('보유하지 않은 종목은 매도 제안 불가', () => {
  assert.equal(checkHasHolding(undefined).ok, false)
  assert.equal(checkHasHolding(0).ok, false)
  assert.equal(checkHasHolding(3).ok, true)
})

test('월 한도 — 이미 쓴 금액과 합산해서 막는다', () => {
  assert.equal(checkMonthlyLimit(0, MONTHLY_LIMIT).ok, true)
  assert.equal(checkMonthlyLimit(0, MONTHLY_LIMIT + 1).ok, false)
  // 한도의 절반을 이미 썼으면 남은 절반까지만
  const half = MONTHLY_LIMIT / 2
  assert.equal(checkMonthlyLimit(half, half).ok, true)
  assert.equal(checkMonthlyLimit(half, half + 1).ok, false)
  assert.equal(checkMonthlyLimit(0, -1).ok, false)
  assert.equal(checkMonthlyLimit(0, '10000' as unknown).ok, false)
})

test('제안서는 7일 뒤 만료된다', () => {
  const created = new Date('2026-08-05T00:00:00.000Z')
  assert.equal(expiresAt(created).toISOString(), '2026-08-12T00:00:00.000Z')

  const p = { status: 'pending' as const, expiresAt: ago(1) }
  assert.equal(isExpired(p), true)
  assert.equal(isExpired({ ...p, status: 'approved' }), false)
})

test('만료·처리된 제안서에는 응답할 수 없다', () => {
  const fresh = { status: 'pending' as const, expiresAt: new Date(Date.now() + DAY).toISOString() }
  assert.equal(checkRespondable(fresh).ok, true)
  assert.equal(checkRespondable({ ...fresh, expiresAt: ago(1) }).ok, false)
  assert.equal(checkRespondable({ ...fresh, status: 'rejected' }).ok, false)
})

test('승인된 제안서만 체결된다', () => {
  assert.equal(checkExecutable('approved').ok, true)
  assert.equal(checkExecutable('pending').ok, false)
  assert.equal(checkExecutable('executed').ok, false)
})

test('위험 룰 — 반려 24시간 내 재제안, 30일 내 3회 이상', () => {
  const rejectedToday = [
    { stockCode: '005930', status: 'rejected' as const, createdAt: ago(0.2) },
  ]
  assert.equal(riskAlerts(rejectedToday, { stockCode: '005930' }).length, 1)
  assert.equal(riskAlerts(rejectedToday, { stockCode: '000660' }).length, 0)

  const thrice = [5, 12, 25].map((d) => ({
    stockCode: '035720',
    status: 'rejected' as const,
    createdAt: ago(d),
  }))
  assert.equal(riskAlerts(thrice, { stockCode: '035720' }).length, 1)

  const old = [40, 50, 60].map((d) => ({
    stockCode: '035720',
    status: 'rejected' as const,
    createdAt: ago(d),
  }))
  assert.equal(riskAlerts(old, { stockCode: '035720' }).length, 0)
})
