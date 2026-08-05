import type { NextRequest } from 'next/server'
import { db, sweepExpired, toProposal } from '@/lib/db'
import { findStock } from '@/lib/stocks'

/**
 * GET /api/proposals/[id] — 카드 상세 (기획안 4장 #5, 3-6)
 *
 * 응답 순서가 곧 화면 우선순위다. proposal(내가 쓴 이유) → timeline → 부모 응답 → 체결 → 시세.
 * 수익률이 이유보다 위로 올라가는 순간 "결과를 왜곡 없이 돌려준다"는 원칙이 깨진다.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/proposals/[id]'>,
) {
  const { id } = await ctx.params
  sweepExpired()

  const row = db.prepare('select * from proposal where id = ?').get(Number(id))
  if (!row) return Response.json({ error: '제안서를 찾을 수 없어요' }, { status: 404 })

  const proposal = toProposal(row)
  const stock = findStock(proposal.stockCode)

  const resp = db
    .prepare('select * from response where proposal_id = ?')
    .get(proposal.id) as Record<string, unknown> | undefined

  const exec = db
    .prepare('select * from execution where proposal_id = ?')
    .get(proposal.id) as Record<string, unknown> | undefined

  // 판단 타임라인 — "왜 샀는지"와 "지금"을 나란히 놓는다
  const timeline: { at: string; type: string; text: string }[] = [
    { at: proposal.createdAt, type: 'proposed', text: `내가 쓴 이유: ${proposal.text}` },
  ]
  if (proposal.coachAnswer) {
    timeline.push({
      at: proposal.createdAt,
      type: 'coached',
      text: `되물었을 때: ${proposal.coachAnswer}`,
    })
  }
  if (resp) {
    timeline.push({
      at: String(resp.responded_at),
      type: resp.approved ? 'approved' : 'rejected',
      text: `${resp.approved ? '승인' : '반려'} — ${String(resp.reason)}`,
    })
  }
  if (exec) {
    timeline.push({
      at: String(exec.executed_at),
      type: 'executed',
      text: `${Number(exec.filled_qty)}주 체결 (1주 ${Number(exec.filled_price).toLocaleString('ko-KR')}원)`,
    })
  }
  if (proposal.status === 'expired') {
    timeline.push({ at: proposal.expiresAt, type: 'expired', text: '기한이 지나 사라졌어요' })
  }

  const price = stock?.price ?? 0
  const qty = price > 0 ? Math.max(1, Math.floor(proposal.targetAmount / price)) : 0

  return Response.json({
    proposal,
    timeline,
    response: resp
      ? {
          proposalId: proposal.id,
          approved: Boolean(resp.approved),
          reason: String(resp.reason),
          respondedAt: String(resp.responded_at),
        }
      : null,
    execution: exec
      ? {
          proposalId: proposal.id,
          orderNo: String(exec.order_no),
          filledPrice: Number(exec.filled_price),
          filledQty: Number(exec.filled_qty),
          executedAt: String(exec.executed_at),
        }
      : null,
    // 부모 승인 화면용. 제안 시점과 승인 시점의 가격이 다르므로 여기서 다시 보여준다
    quote: { price, qty, estimate: price * qty },
  })
}
