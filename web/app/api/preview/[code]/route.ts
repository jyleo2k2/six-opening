import type { NextRequest } from 'next/server'
import { findStock, priceThen } from '@/lib/stocks'

/**
 * GET /api/preview/[code] — 예습 모드 (기획안 4장 #8)
 *
 * "3개월 전에 샀다면 지금 얼마" 딱 하나. 화면도 1장을 넘기지 않는다.
 * 가상 종목·가상 세계를 만드는 순간 "실제 계좌를 교재로 쓴다"는 차별점이 스스로 무너진다.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/preview/[code]'>,
) {
  const { code } = await ctx.params

  const stock = findStock(code)
  const then = priceThen(code)
  if (!stock || then === undefined) {
    return Response.json({ error: '고를 수 없는 종목이에요' }, { status: 404 })
  }

  const now = stock.price
  const diff = now - then

  return Response.json({
    code: stock.code,
    name: stock.name,
    priceThen: then,
    priceNow: now,
    diff,
    // 손실도 그대로 보여준다. 숨기면 타임라인 원칙이 깨진다
    message:
      diff === 0
        ? '3개월 전이랑 값이 같아요'
        : diff > 0
          ? `3개월 전에 1주를 샀다면 지금 ${diff.toLocaleString('ko-KR')}원 늘었어요`
          : `3개월 전에 1주를 샀다면 지금 ${Math.abs(diff).toLocaleString('ko-KR')}원 줄었어요`,
  })
}
