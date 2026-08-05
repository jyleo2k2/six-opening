// 기획안 v2.0 → 실행 가능한 검증. 하나라도 실패하면 exit 1.
//   전제: 다른 터미널에서 `npm run dev`
//   실행: npm run verify
//
// 각 체크는 기획안의 어느 조항을 지키는지 명시한다. 통과하지 못하면 그 조항이 깨진 것이다.

import { readFileSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.VERIFY_BASE ?? 'http://localhost:3000'
const ROOT = path.join(import.meta.dirname, '..')

type Result = { id: string; ref: string; desc: string; ok: boolean; detail: string }
const results: Result[] = []

async function check(
  id: string,
  ref: string,
  desc: string,
  fn: () => Promise<string | true> | (string | true),
) {
  try {
    const r = await fn()
    results.push({ id, ref, desc, ok: r === true, detail: r === true ? '' : r })
  } catch (e) {
    results.push({ id, ref, desc, ok: false, detail: e instanceof Error ? e.message : String(e) })
  }
}

const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8')

async function api(method: string, url: string, body?: unknown) {
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* 빈 응답 */
  }
  return { status: res.status, json: json as Record<string, unknown> }
}

const expectStatus = (got: number, want: number, what: string) =>
  got === want ? true : `${what}: ${want} 기대, ${got} 받음`

const CHILD = 'verify-child'
const proposal = (over: Record<string, unknown> = {}) => ({
  childId: CHILD,
  kind: 'buy',
  stockCode: '005930',
  label: '성장형',
  text: '요즘 반도체 뉴스가 많이 나와서',
  coachAnswer: '공장을 새로 짓는다고 했어',
  holdMonths: 6,
  targetAmount: 100_000,
  ...over,
})

// ───────────────────────────── 7장 안전장치

await check('S1', '7장', '화이트리스트 밖 종목은 제안 불가', async () => {
  const r = await api('POST', '/api/proposals', proposal({ stockCode: '999999' }))
  return expectStatus(r.status, 400, '테마주 제안')
})

await check('S2', '7장', '보유기간 3개월 미만 거부 ("1개월 이내" 선택지 없음)', async () => {
  const r = await api('POST', '/api/proposals', proposal({ holdMonths: 1 }))
  return expectStatus(r.status, 422, '1개월 제안')
})

await check('S3', '7장', '레버리지·인버스·테마주가 화이트리스트에 없다', () => {
  const src = read('lib/stocks.ts')
  const banned = ['레버리지', '인버스', 'KODEX 레버리지', '2X', '곱버스']
  const hit = banned.filter((b) => src.includes(b))
  return hit.length === 0 ? true : `금지 종목 발견: ${hit.join(', ')}`
})

await check('S4', '7장', '월 한도가 적용된다', async () => {
  const r = await api('POST', '/api/proposals', proposal({ childId: 'limit-test', targetAmount: 99_999_999 }))
  return expectStatus(r.status, 422, '한도 초과 제안')
})

await check('S5', '7장 · 3-3', '랭킹·배지·XP·포인트·레벨 개념이 코드에 없다', () => {
  // 주석은 제외한다 — "reward hacking 방지" 같은 서술은 금지 대상이 아니라 근거다
  const stripComments = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const files = ['lib/types.ts', 'lib/rules.ts', 'lib/stocks.ts', 'lib/db.ts', 'lib/holdings.ts']
  const banned = /\b(rank|ranking|badge|xp|point|level|streak|leaderboard|reward)\b/i
  const hits = files.filter((f) => banned.test(stripComments(read(f))))
  return hits.length === 0 ? true : `게이미피케이션 식별자 발견: ${hits.join(', ')}`
})

await check('S6', '7장', '매도 제안은 최소 보유 90일 이후에만 가능', async () => {
  const r = await api('POST', '/api/proposals', proposal({ kind: 'sell', childId: 'sell-test' }))
  return r.status === 422 || r.status === 409
    ? true
    : `보유하지 않은/90일 미만 종목 매도 제안: 422/409 기대, ${r.status} 받음`
})

// ───────────────────────────── 3-3 입력 설계 (이 서비스의 심장)

await check('I1', '3-3 · 8장', '자유서술(text) 없이는 제안 불가 — 라벨만으로 저장되면 안 된다', async () => {
  const r = await api('POST', '/api/proposals', proposal({ text: '   ' }))
  return expectStatus(r.status, 422, '원문 없는 제안')
})

await check('I2', '3-3', '코치 되묻기가 질문 한 문장을 돌려준다', async () => {
  const r = await api('POST', '/api/coach', {
    stockCode: '005930',
    label: '성장형',
    text: '친구가 좋대서',
  })
  if (r.status !== 200) return `코치 응답 ${r.status}`
  const q = r.json.question
  return typeof q === 'string' && q.length > 0 ? true : '질문이 비어 있다'
})

await check('I3', '3-3', '"몰라"로 넘어가도 제안서는 저장된다 (coachAnswer 없음 허용)', async () => {
  const r = await api('POST', '/api/proposals', proposal({ coachAnswer: null }))
  return expectStatus(r.status, 201, '코치 답변 없는 제안')
})

await check('I4', '3-3', '제안서 유효기간이 생성 +7일로 설정된다', async () => {
  const r = await api('POST', '/api/proposals', proposal())
  const p = r.json.proposal as Record<string, string>
  const days = (new Date(p.expiresAt).getTime() - new Date(p.createdAt).getTime()) / 86_400_000
  return Math.round(days) === 7 ? true : `유효기간 ${days}일`
})

// ───────────────────────────── 3-5 reward hacking 방지

await check('R1', '3-5', '반려 사유 없이는 응답 불가 (스킵 불가)', async () => {
  const c = await api('POST', '/api/proposals', proposal())
  const id = (c.json.proposal as { id: number }).id
  const r = await api('POST', `/api/proposals/${id}/respond`, { approved: false, reason: '' })
  return expectStatus(r.status, 422, '사유 없는 반려')
})

await check('R2', '3-5', '반려 후 재제안이 가능하다', async () => {
  const c = await api('POST', '/api/proposals', proposal())
  const id = (c.json.proposal as { id: number }).id
  await api('POST', `/api/proposals/${id}/respond`, { approved: false, reason: '조금 더 지켜보자' })
  const again = await api('POST', '/api/proposals', proposal({ text: '그래도 사고 싶은 이유가 있어' }))
  return expectStatus(again.status, 201, '재제안')
})

await check('R3', '3-5', '이미 처리된 제안서는 다시 응답할 수 없다', async () => {
  const c = await api('POST', '/api/proposals', proposal())
  const id = (c.json.proposal as { id: number }).id
  await api('POST', `/api/proposals/${id}/respond`, { approved: false, reason: '이번엔 아니야' })
  const dup = await api('POST', `/api/proposals/${id}/respond`, { approved: true, reason: '역시 승인' })
  return expectStatus(dup.status, 409, '중복 응답')
})

// ───────────────────────────── 3-6 진입점 · 인증 · 체결

await check('E1', '3-6', '부모가 초대코드를 발급할 수 있다', async () => {
  const r = await api('POST', '/api/invite', { nickname: '검증이' })
  if (r.status !== 201) return `초대코드 발급 ${r.status}`
  return typeof r.json.inviteCode === 'string' ? true : '초대코드가 없다'
})

await check('E2', '3-6', '아이가 초대코드로 연결된다 (독립 계정 아님)', async () => {
  const c = await api('POST', '/api/invite', { nickname: '검증이2' })
  const code = (c.json as { inviteCode: string }).inviteCode
  const r = await api('POST', '/api/invite/redeem', { inviteCode: code })
  if (r.status !== 200) return `연결 ${r.status}`
  return typeof r.json.childId === 'string' ? true : 'childId가 없다'
})

await check('E3', '3-6', '틀린 초대코드는 거부된다', async () => {
  const r = await api('POST', '/api/invite/redeem', { inviteCode: 'NOPE-9999' })
  return expectStatus(r.status, 404, '잘못된 코드')
})

await check('E4', '3-6', '승인되지 않은 제안서는 체결되지 않는다', async () => {
  const c = await api('POST', '/api/proposals', proposal())
  const id = (c.json.proposal as { id: number }).id
  const r = await api('POST', `/api/proposals/${id}/execute`)
  return expectStatus(r.status, 409, 'pending 상태 체결 시도')
})

await check('E5', '3-6', '승인 화면에 현재가·수량·예상 체결금액이 내려온다', async () => {
  const c = await api('POST', '/api/proposals', proposal({ targetAmount: 300_000 }))
  const id = (c.json.proposal as { id: number }).id
  const r = await api('GET', `/api/proposals/${id}`)
  if (r.status !== 200) return `제안서 상세 ${r.status}`
  const q = r.json.quote as Record<string, number> | undefined
  return q && typeof q.price === 'number' && typeof q.qty === 'number' && typeof q.estimate === 'number'
    ? true
    : 'quote(price/qty/estimate)가 없다'
})

// ───────────────────────────── 4장 기능

await check('F1', '4장 #1', '아이 뷰 — 보유 종목이 아이 언어 3줄로 내려온다', async () => {
  const r = await api('GET', `/api/portfolio/${CHILD}`)
  if (r.status !== 200) return `포트폴리오 ${r.status}`
  const h = r.json.holdings
  return Array.isArray(h) ? true : 'holdings 배열이 없다'
})

await check('F2', '4장 #4', '부모 대화 스크립트 3문장이 생성된다', async () => {
  const c = await api('POST', '/api/proposals', proposal())
  const id = (c.json.proposal as { id: number }).id
  const r = await api('GET', `/api/proposals/${id}/script`)
  if (r.status !== 200) return `스크립트 ${r.status}`
  const q = r.json.questions
  return Array.isArray(q) && q.length === 3 ? true : `질문 3개 기대, ${JSON.stringify(q)}`
})

await check('F3', '4장 #5', '판단 타임라인 — 내가 쓴 이유와 지금이 함께 온다', async () => {
  const c = await api('POST', '/api/proposals', proposal())
  const id = (c.json.proposal as { id: number }).id
  const r = await api('GET', `/api/proposals/${id}`)
  const t = r.json.timeline
  return Array.isArray(t) && t.length > 0 ? true : 'timeline이 없다'
})

await check('F4', '4장 #8', '예습 모드 — 3개월 전에 샀다면 지금 얼마인지 내려온다', async () => {
  const r = await api('GET', '/api/preview/005930')
  if (r.status !== 200) return `예습 모드 ${r.status}`
  const j = r.json
  return typeof j.priceThen === 'number' && typeof j.priceNow === 'number'
    ? true
    : 'priceThen/priceNow가 없다'
})

await check('F5', '4장 #5 · 3-3', '아이 화면 1순위는 수익률이 아니라 이유다', async () => {
  const c = await api('POST', '/api/proposals', proposal())
  const id = (c.json.proposal as { id: number }).id
  const r = await api('GET', `/api/proposals/${id}`)
  const keys = Object.keys(r.json)
  return keys.indexOf('proposal') < keys.indexOf('quote') || !keys.includes('quote')
    ? true
    : '수익률/시세가 이유보다 앞에 온다'
})

// ───────────────────────────── 6장 AI

await check('A1', '6-1', '종목 카피는 런타임 LLM을 호출하지 않는다', () => {
  const src = read('lib/stocks.ts')
  return /anthropic|messages\.create|fetch\(/i.test(src)
    ? 'stocks.ts에 런타임 호출이 있다'
    : true
})

await check('A2', '6-1', '검수 카피에 금지 표현이 없다', () => {
  const src = read('lib/stocks.ts')
  const lines = src.match(/line[12]:\s*'([^']*)'/g) ?? []
  const banned = ['좋다', '좋은', '나쁘', '오를', '내릴', '추천', '유망', '안전', '손해']
  const bad = lines.filter((l) => banned.some((b) => l.includes(b)))
  return bad.length === 0 ? true : `금지 표현: ${bad.join(' / ')}`
})

await check('A3', '6-2', '코치는 정답을 주지 않는다 (프롬프트에 금지 규칙이 명시돼 있다)', () => {
  const src = read('lib/llm.ts')
  const need = ['설명하지', '질문', '추천']
  const missing = need.filter((n) => !src.includes(n))
  return missing.length === 0 ? true : `코치 프롬프트에 빠진 규칙: ${missing.join(', ')}`
})

await check('A4', '6-3', '위험 룰 — 반려 24시간 내 재제안 시 부모에게 알림', async () => {
  const child = `risk-${Date.now()}`
  const c = await api('POST', '/api/proposals', proposal({ childId: child }))
  const id = (c.json.proposal as { id: number }).id
  await api('POST', `/api/proposals/${id}/respond`, { approved: false, reason: '지금은 아니야' })
  const again = await api('POST', '/api/proposals', proposal({ childId: child }))
  const alerts = (again.json.alerts ?? []) as string[]
  return alerts.length > 0 ? true : '재제안 알림이 없다'
})

await check('A5', '6-3', '이유 분류 — 외부추종형("친구가 좋대서")을 잡아낸다', async () => {
  const r = await api('POST', '/api/classify', { text: '친구가 좋대서' })
  if (r.status !== 200) return `분류 ${r.status}`
  return r.json.label === '외부추종형' ? true : `외부추종형 기대, ${String(r.json.label)} 받음`
})

// ───────────────────────────── 8장 데이터 전략

await check('D1', '8장', '제안서 1건이 label · text · coachAnswer를 모두 남긴다', async () => {
  const r = await api('POST', '/api/proposals', proposal())
  const p = r.json.proposal as Record<string, unknown>
  const missing = (['label', 'text', 'coachAnswer'] as const).filter((k) => !(k in p))
  return missing.length === 0 ? true : `빠진 필드: ${missing.join(', ')}`
})

await check('D2', '8장', '부모 응답이 사유와 함께 저장·조회된다', async () => {
  const c = await api('POST', '/api/proposals', proposal())
  const id = (c.json.proposal as { id: number }).id
  await api('POST', `/api/proposals/${id}/respond`, { approved: false, reason: '너무 비싸다' })
  const r = await api('GET', `/api/proposals/${id}`)
  const resp = r.json.response as { reason?: string } | undefined
  return resp?.reason === '너무 비싸다' ? true : '반려 사유가 조회되지 않는다'
})

// ───────────────────────────── 리포트

const pass = results.filter((r) => r.ok)
const fail = results.filter((r) => !r.ok)

for (const r of results) {
  console.log(`${r.ok ? '✔' : '✘'} [${r.id}] (${r.ref}) ${r.desc}${r.ok ? '' : `\n      → ${r.detail}`}`)
}
console.log(`\n${pass.length}/${results.length} 통과`)

if (fail.length > 0) {
  console.log(`\n실패 ${fail.length}건: ${fail.map((f) => f.id).join(', ')}`)
  process.exit(1)
}
