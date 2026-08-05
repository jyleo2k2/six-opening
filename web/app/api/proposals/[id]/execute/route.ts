import type { NextRequest } from 'next/server'
import { db, toProposal } from '@/lib/db'
import { checkExecutable } from '@/lib/rules'
import { findStock } from '@/lib/stocks'
import { placeOrder } from '@/lib/kiwoom'
import type { Execution } from '@/lib/types'

/**
 * POST /api/proposals/[id]/execute — 승인된 제안서를 키움 모의투자로 체결
 * 백엔드 1순위: 토큰 발급 → 주문 → 체결 회신 왕복을 여기서 뚫는다.
 */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/proposals/[id]/execute'>,
) {
  const { id } = await ctx.params

  const row = db.prepare('select * from proposal where id = ?').get(Number(id))
  if (!row) return Response.json({ error: '제안서를 찾을 수 없어요' }, { status: 404 })

  const proposal = toProposal(row)
  const c = checkExecutable(proposal.status)
  if (!c.ok) return Response.json({ error: c.error }, { status: 409 })

  const stock = findStock(proposal.stockCode)
  if (!stock) return Response.json({ error: '종목 정보가 없어요' }, { status: 400 })

  // 목표 금액 안에서 살 수 있는 수량. 한 주도 못 사면 체결하지 않는다
  const qty = Math.max(1, Math.floor(proposal.targetAmount / stock.price))

  let order
  try {
    order = await placeOrder({
      kind: proposal.kind,
      stockCode: proposal.stockCode,
      qty,
      refPrice: stock.price,
    })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '주문에 실패했어요' },
      { status: 502 },
    )
  }

  const executedAt = new Date().toISOString()
  db.prepare('update proposal set status = ? where id = ?').run('executed', proposal.id)
  db.prepare(
    `insert into execution (proposal_id, order_no, filled_price, filled_qty, executed_at)
     values (?, ?, ?, ?, ?)`,
  ).run(proposal.id, order.orderNo, order.filledPrice, order.filledQty, executedAt)

  return Response.json({
    proposal: { ...proposal, status: 'executed' as const },
    execution: {
      proposalId: proposal.id,
      orderNo: order.orderNo,
      filledPrice: order.filledPrice,
      filledQty: order.filledQty,
      executedAt,
    } satisfies Execution,
  })
}
