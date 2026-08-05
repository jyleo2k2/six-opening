import { db } from '@/lib/db'

/** POST /api/invite/redeem — 아이 앱에서 초대코드를 입력해 부모 계좌에 연결한다 */
export async function POST(request: Request) {
  const { inviteCode } = (await request.json().catch(() => ({}))) as { inviteCode?: string }
  if (!inviteCode?.trim()) {
    return Response.json({ error: '초대코드를 입력해 주세요' }, { status: 400 })
  }

  const code = inviteCode.trim().toUpperCase()
  const row = db
    .prepare('select id, nickname from child where invite_code = ?')
    .get(code) as Record<string, unknown> | undefined

  if (!row) {
    return Response.json({ error: '초대코드를 찾을 수 없어요' }, { status: 404 })
  }

  const childId = String(row.id)
  db.prepare('update child set linked_at = ? where id = ?').run(
    new Date().toISOString(),
    childId,
  )

  return Response.json({ childId, nickname: String(row.nickname) })
}
