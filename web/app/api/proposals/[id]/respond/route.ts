import type { NextRequest } from 'next/server'
import { db, sweepExpired, toProposal } from '@/lib/db'
import { checkReason, checkRespondable } from '@/lib/rules'
import type { ParentResponse } from '@/lib/types'

/**
 * POST /api/proposals/[id]/respond — 부모 승인·반려
 * 사유는 필수다. 빈 값이면 422 — "그냥 안 돼"를 서버에서 막는 것이 이 서비스의 핵심 장치다.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/proposals/[id]/respond'>,
) {
  const { id } = await ctx.params
  const body = (await request.json()) as Partial<ParentResponse>

  const r = checkReason(body.reason)
  if (!r.ok) return Response.json({ error: r.error }, { status: 422 })

  sweepExpired()
  const row = db.prepare('select * from proposal where id = ?').get(Number(id))
  if (!row) return Response.json({ error: '제안서를 찾을 수 없어요' }, { status: 404 })

  const proposal = toProposal(row)
  const c = checkRespondable(proposal)
  if (!c.ok) return Response.json({ error: c.error }, { status: 409 })

  const approved = body.approved === true
  const now = new Date().toISOString()

  db.prepare('update proposal set status = ? where id = ?').run(
    approved ? 'approved' : 'rejected',
    proposal.id,
  )
  db.prepare(
    `insert into response (proposal_id, approved, reason, responded_at)
     values (?, ?, ?, ?)`,
  ).run(proposal.id, approved ? 1 : 0, body.reason!.trim(), now)

  return Response.json({
    proposal: { ...proposal, status: approved ? 'approved' : 'rejected' },
    response: {
      proposalId: proposal.id,
      approved,
      reason: body.reason!.trim(),
      respondedAt: now,
    } satisfies ParentResponse,
  })
}
