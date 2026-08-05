// 보유 종목은 별도 테이블이 아니라 체결 내역에서 파생한다.
// 매수 체결 - 매도 체결. 90일 규칙과 아이 뷰가 같은 소스를 본다.

import { db } from './db'
import { findStock } from './stocks'

export interface Holding {
  stockCode: string
  qty: number
  /** 평단가(원) */
  avgPrice: number
  /** 최초 매수 체결 시각. 최소 보유 90일 계산 기준 */
  firstBoughtAt: string
}

export function holdingsOf(childId: string): Holding[] {
  const rows = db
    .prepare(
      `select p.stock_code, p.kind, e.filled_qty, e.filled_price, e.executed_at
         from execution e
         join proposal p on p.id = e.proposal_id
        where p.child_id = ?
        order by e.executed_at asc`,
    )
    .all(childId) as Record<string, unknown>[]

  const acc = new Map<string, Holding & { cost: number }>()
  for (const r of rows) {
    const code = String(r.stock_code)
    const qty = Number(r.filled_qty)
    const price = Number(r.filled_price)
    const at = String(r.executed_at)

    const h =
      acc.get(code) ??
      { stockCode: code, qty: 0, avgPrice: 0, firstBoughtAt: at, cost: 0 }

    if (r.kind === 'buy') {
      h.qty += qty
      h.cost += qty * price
    } else {
      // 매도는 평단가를 바꾸지 않는다 — 남은 수량 비율만큼 원가를 덜어낸다
      const sold = Math.min(qty, h.qty)
      h.cost -= h.qty > 0 ? (h.cost / h.qty) * sold : 0
      h.qty -= sold
    }
    h.avgPrice = h.qty > 0 ? Math.round(h.cost / h.qty) : 0
    acc.set(code, h)
  }

  return [...acc.values()]
    .filter((h) => h.qty > 0)
    .map(({ cost: _cost, ...h }) => h)
}

export function holdingOf(childId: string, stockCode: string): Holding | undefined {
  return holdingsOf(childId).find((h) => h.stockCode === stockCode)
}

/**
 * 이번 달 쓴 금액. 월 한도 계산용.
 * 체결된 금액 + 승인됐지만 아직 체결 안 된 금액을 함께 센다 —
 * 승인만 쌓아두면 한도를 우회할 수 있다.
 */
export function spentThisMonth(childId: string, now = new Date()): number {
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const executed = db
    .prepare(
      `select coalesce(sum(e.filled_qty * e.filled_price), 0) as total
         from execution e
         join proposal p on p.id = e.proposal_id
        where p.child_id = ? and p.kind = 'buy' and e.executed_at >= ?`,
    )
    .get(childId, from) as Record<string, unknown>

  const approved = db
    .prepare(
      `select coalesce(sum(p.target_amount), 0) as total
         from proposal p
        where p.child_id = ? and p.kind = 'buy'
          and p.status = 'approved' and p.created_at >= ?`,
    )
    .get(childId, from) as Record<string, unknown>

  return Number(executed?.total ?? 0) + Number(approved?.total ?? 0)
}

/** 아이 뷰용 — 보유 종목을 아이 언어 3줄과 함께 (기획안 4장 #1) */
export function holdingsForChildView(childId: string) {
  return holdingsOf(childId).map((h) => {
    const s = findStock(h.stockCode)
    return {
      ...h,
      name: s?.name ?? h.stockCode,
      line1: s?.line1 ?? '',
      line2: s?.line2 ?? '',
      price: s?.price ?? 0,
      value: (s?.price ?? 0) * h.qty,
    }
  })
}
