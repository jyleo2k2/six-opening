import { classifyReason } from '@/lib/llm'
import { checkText } from '@/lib/rules'

/**
 * POST /api/classify — 이유 분류 (기획안 6-3)
 * 제로샷이라 학습 데이터가 필요 없다. 5장 성향 리포트의 "판단 근거 유형" 축을 그대로 재사용한다.
 */
export async function POST(request: Request) {
  const { text } = (await request.json().catch(() => ({}))) as { text?: string }

  const t = checkText(text)
  if (!t.ok) return Response.json({ error: t.error }, { status: 422 })

  return Response.json({ label: await classifyReason(text!) })
}
