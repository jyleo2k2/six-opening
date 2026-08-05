import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'

/**
 * POST /api/invite — 부모가 아이를 초대한다 (기획안 3-6)
 * 만 14세 미만은 본인 인증 수단이 없다. 초대코드 + 부모 기기 승인이 유일한 경로이고,
 * 아이 앱은 독립 계정이 아니라 부모 계좌에 종속된 서브 프로필이다.
 */
export async function POST(request: Request) {
  const { nickname } = (await request.json().catch(() => ({}))) as { nickname?: string }
  if (!nickname?.trim()) {
    return Response.json({ error: '아이 이름을 적어 주세요' }, { status: 400 })
  }

  const childId = randomUUID()
  const inviteCode = newCode()

  db.prepare(
    'insert into child (id, nickname, invite_code, linked_at) values (?, ?, ?, null)',
  ).run(childId, nickname.trim(), inviteCode)

  return Response.json({ childId, nickname: nickname.trim(), inviteCode }, { status: 201 })
}

/** 아이가 손으로 옮겨 적는다. 헷갈리는 0/O/1/I는 뺀다 */
function newCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `${code.slice(0, 3)}-${code.slice(3)}`
}
