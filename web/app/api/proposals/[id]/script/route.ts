import type { NextRequest } from 'next/server'
import { db, toProposal } from '@/lib/db'
import { findStock } from '@/lib/stocks'
import { conversationScript } from '@/lib/llm'

/**
 * GET /api/proposals/[id]/script — 부모 대화 스크립트 3문장 (기획안 4장 #4)
 * 부모에게만 나가므로 미성년 대상 투자권유 이슈 밖이다. 실패해도 고정 질문 3개로 내려간다.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/proposals/[id]/script'>,
) {
  const { id } = await ctx.params

  const row = db.prepare('select * from proposal where id = ?').get(Number(id))
  if (!row) return Response.json({ error: '제안서를 찾을 수 없어요' }, { status: 404 })

  const p = toProposal(row)
  const stock = findStock(p.stockCode)
  const questions = await conversationScript(p, stock?.name ?? p.stockCode)

  return Response.json({ questions })
}
