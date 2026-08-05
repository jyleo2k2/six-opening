import { coachQuestion } from '@/lib/llm'
import { findStock } from '@/lib/stocks'
import { checkText } from '@/lib/rules'
import type { CoachRequest, CoachResponse } from '@/lib/types'

/** 되묻기 1회. 실패해도 제안서 작성을 막지 않는다 */
export async function POST(request: Request) {
  const body = (await request.json()) as CoachRequest & { stockCode?: string }

  const t = checkText(body.text)
  if (!t.ok) return Response.json({ error: t.error }, { status: 422 })

  const stockName =
    body.stockName ?? (body.stockCode ? findStock(body.stockCode)?.name : undefined)
  if (!stockName) {
    return Response.json({ error: '종목을 찾을 수 없어요' }, { status: 400 })
  }

  try {
    const question = await coachQuestion({
      stockName,
      label: body.label,
      text: body.text,
    })
    return Response.json({ question } satisfies CoachResponse)
  } catch {
    // 코치가 죽어도 아이는 계속 쓸 수 있어야 한다
    return Response.json({
      question: '왜 그렇게 생각했는지 하나만 더 말해 줄래?',
    } satisfies CoachResponse)
  }
}
