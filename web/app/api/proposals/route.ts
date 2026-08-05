import { db, sweepExpired, toProposal } from '@/lib/db'
import { isWhitelisted } from '@/lib/stocks'
import { holdingOf, spentThisMonth } from '@/lib/holdings'
import {
  checkHasHolding,
  checkHoldMonths,
  checkMonthlyLimit,
  checkSell,
  checkText,
  expiresAt,
  riskAlerts,
} from '@/lib/rules'
import type { Proposal } from '@/lib/types'

/** GET /api/proposals?childId=... — 아이·부모 공용 목록 */
export async function GET(request: Request) {
  sweepExpired()
  const childId = new URL(request.url).searchParams.get('childId')

  const rows = childId
    ? db
        .prepare('select * from proposal where child_id = ? order by id desc')
        .all(childId)
    : db.prepare('select * from proposal order by id desc').all()

  return Response.json(rows.map(toProposal))
}

/** POST /api/proposals — 제안서 제출 */
export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Proposal>

  if (!body.childId) {
    return Response.json({ error: '아이 정보가 없어요' }, { status: 400 })
  }
  if (!body.stockCode || !isWhitelisted(body.stockCode)) {
    return Response.json({ error: '고를 수 없는 종목이에요' }, { status: 400 })
  }

  // 아이 원문 필수 — 라벨만 남으면 이 서비스의 데이터가 무의미해진다
  const t = checkText(body.text)
  if (!t.ok) return Response.json({ error: t.error }, { status: 422 })

  const h = checkHoldMonths(body.holdMonths)
  if (!h.ok) return Response.json({ error: h.error }, { status: 422 })

  const kind = body.kind ?? 'buy'

  if (kind === 'sell') {
    // 최소 보유 90일. 단타를 학습시키지 않는 것이 이 규칙의 목적이다
    const holding = holdingOf(body.childId, body.stockCode)
    const hh = checkHasHolding(holding?.qty)
    if (!hh.ok) return Response.json({ error: hh.error }, { status: 422 })

    const s = checkSell(holding!.firstBoughtAt)
    if (!s.ok) return Response.json({ error: s.error }, { status: 422 })
  } else {
    // 월 한도. 용돈 수준을 넘지 않게 한다
    const m = checkMonthlyLimit(spentThisMonth(body.childId), body.targetAmount)
    if (!m.ok) return Response.json({ error: m.error }, { status: 422 })
  }

  const now = new Date()
  const history = db
    .prepare('select stock_code, status, created_at from proposal where child_id = ?')
    .all(body.childId)
    .map((r) => ({
      stockCode: String((r as Record<string, unknown>).stock_code),
      status: (r as Record<string, unknown>).status as Proposal['status'],
      createdAt: String((r as Record<string, unknown>).created_at),
    }))

  const info = db
    .prepare(
      `insert into proposal
         (child_id, kind, stock_code, label, text, coach_answer,
          hold_months, target_amount, status, created_at, expires_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
    .run(
      body.childId,
      kind,
      body.stockCode,
      body.label ?? '자유',
      body.text!.trim(),
      body.coachAnswer?.trim() || null,
      body.holdMonths!,
      body.targetAmount ?? 0,
      now.toISOString(),
      expiresAt(now).toISOString(),
    )

  const row = db
    .prepare('select * from proposal where id = ?')
    .get(Number(info.lastInsertRowid))!

  return Response.json(
    {
      proposal: toProposal(row),
      alerts: riskAlerts(history, { stockCode: body.stockCode }, now),
    },
    { status: 201 },
  )
}
