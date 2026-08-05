import { STOCKS, priceInKidTerms } from '@/lib/stocks'

/** 화이트리스트 + 아이 언어 카피 3줄. 3번째 줄만 런타임 계산 */
export async function GET() {
  return Response.json(
    STOCKS.map((s) => ({
      ...s,
      line3: `지금 1주는 ${priceInKidTerms(s.price)}`,
    })),
  )
}
