import type { NextRequest } from 'next/server'
import { holdingsForChildView, spentThisMonth } from '@/lib/holdings'
import { priceInKidTerms } from '@/lib/stocks'
import { MONTHLY_LIMIT } from '@/lib/rules'

/**
 * GET /api/portfolio/[childId] — 아이 뷰 (기획안 4장 #1)
 * 숫자를 아이 언어로 번역한 3줄. 3번째 줄만 런타임 계산이고 LLM은 쓰지 않는다.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/portfolio/[childId]'>,
) {
  const { childId } = await ctx.params

  const holdings = holdingsForChildView(childId).map((h) => ({
    ...h,
    line3: `지금 1주는 ${priceInKidTerms(h.price)}`,
  }))

  const spent = spentThisMonth(childId)

  return Response.json({
    holdings,
    total: holdings.reduce((sum, h) => sum + h.value, 0),
    monthly: { spent, limit: MONTHLY_LIMIT, left: Math.max(0, MONTHLY_LIMIT - spent) },
  })
}
