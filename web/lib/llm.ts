// 이 프로젝트의 유일한 실시간 LLM — 제안서 코치(기획안 6-2).
//
// 설계 원칙 3개가 곧 안전장치다:
//   1. 정답 금지. 되묻기만 한다 → 사실 주장을 안 하므로 투자권유·환각 리스크가 구조적으로 낮다.
//   2. 되묻기 1회. 두 번 이상 캐물으면 아이가 이탈한다.
//   3. "몰라"도 통과. 강제하지 않는다(호출부에서 처리).

import Anthropic from '@anthropic-ai/sdk'
import type { CoachRequest, Proposal, ReasonLabel } from './types'

const client = new Anthropic()

const MODEL = 'claude-opus-5'

async function ask(system: string, user: string, maxTokens = 2000): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    output_config: { effort: 'low' },
    system,
    messages: [{ role: 'user', content: user }],
  })
  return res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

const SYSTEM = `너는 초등학교 3~6학년 아이가 쓴 "이 주식을 왜 사고 싶은지"를 읽고, 되묻는 질문을 딱 하나 만드는 역할이야.

지켜야 할 것:
- 질문 한 문장만 출력해. 인사, 설명, 칭찬, 따옴표 없이 질문만.
- 아이가 쓴 이유의 근거를 되물어. "어떤 걸 보고 그렇게 생각했어?" 같은 방향.
- 종목이나 회사에 대한 사실, 전망, 평가를 절대 말하지 마. 설명하지 말고 묻기만 해.
- 좋다/나쁘다/오를 것/내릴 것/추천/유망/안전 같은 표현을 쓰지 마.
- 초등학생이 읽는 말투로, 25자 안팎으로 짧게.`

export async function coachQuestion(req: CoachRequest): Promise<string> {
  const text = await ask(
    SYSTEM,
    `종목: ${req.stockName}\n아이가 고른 유형: ${req.label}\n아이가 쓴 이유: ${req.text}`,
  )
  return text || '왜 그렇게 생각했는지 하나만 더 말해 줄래?'
}

// ───────────────────────────── 부모 대화 스크립트 (기획안 4장 #4)
// 부모에게만 나가므로 미성년 대상 투자권유 이슈 밖이다.

const SCRIPT_SYSTEM = `너는 초등학생 자녀가 쓴 주식 제안서를 읽고, 부모가 아이에게 물어볼 질문 3개를 만드는 역할이야.

지켜야 할 것:
- 질문 3개만 출력해. 한 줄에 하나씩, 번호나 기호 없이.
- 아이의 판단 근거를 더 꺼내게 하는 질문이어야 해. 정답을 알려주는 질문은 안 돼.
- 종목의 전망이나 평가를 담지 마.
- 부모가 그대로 소리내어 읽을 수 있는 자연스러운 말투로.`

const SCRIPT_FALLBACK = [
  '왜 이 회사를 골랐는지 다시 한 번 말해 줄래?',
  '그렇게 생각한 걸 어디서 보고 알게 됐어?',
  '만약 값이 내려가면 그때는 어떻게 할 거야?',
]

export async function conversationScript(
  p: Pick<Proposal, 'text' | 'coachAnswer' | 'holdMonths' | 'targetAmount'>,
  stockName: string,
): Promise<string[]> {
  try {
    const out = await ask(
      SCRIPT_SYSTEM,
      [
        `종목: ${stockName}`,
        `아이가 쓴 이유: ${p.text}`,
        p.coachAnswer ? `되물었을 때 답: ${p.coachAnswer}` : '되물었을 때: 답하지 않음',
        `가지고 있겠다는 기간: ${p.holdMonths}개월`,
        `목표 금액: ${p.targetAmount}원`,
      ].join('\n'),
    )
    const lines = out
      .split('\n')
      .map((l) => l.replace(/^[\s\d.)\-*·]+/, '').trim())
      .filter(Boolean)
    return lines.length >= 3 ? lines.slice(0, 3) : SCRIPT_FALLBACK
  } catch {
    return SCRIPT_FALLBACK
  }
}

// ───────────────────────────── 이유 분류 (기획안 6-3)
// 제로샷. 학습 데이터가 필요 없고, 5장 성향 리포트의 "판단 근거 유형" 축을 그대로 재사용한다.

const LABELS: ReasonLabel[] = ['성장형', '제품경험형', '뉴스형', '숫자형', '외부추종형']

const CLASSIFY_SYSTEM = `아이가 쓴 "이 주식을 사고 싶은 이유"를 다음 다섯 중 하나로 분류해.

성장형: 앞으로 커질 것 같다는 판단
제품경험형: 자기가 직접 쓰거나 겪어 본 제품·서비스
뉴스형: 뉴스나 기사에서 본 내용
숫자형: 가격, 실적, 배당 같은 숫자
외부추종형: 친구·유튜브·SNS·누가 좋다고 해서

분류 결과 한 단어만 출력해. 다른 말은 하지 마.`

/** LLM이 없거나 실패해도 동작해야 한다 — 외부추종은 키워드로도 잡힌다 */
function classifyByKeyword(text: string): ReasonLabel {
  const t = text.replace(/\s/g, '')
  if (/친구|유튜브|유튭|틱톡|인스타|형|누나|언니|선생님|좋대|추천받|남들|봤는데다들/.test(t)) {
    return '외부추종형'
  }
  if (/뉴스|기사|신문|방송|보도/.test(t)) return '뉴스형'
  if (/원|퍼센트|%|배당|실적|매출|이익|싸|비싸/.test(t)) return '숫자형'
  if (/써봤|쓰고|먹어|타고|입어|게임|내폰|우리집|매일/.test(t)) return '제품경험형'
  return '성장형'
}

export async function classifyReason(text: string): Promise<ReasonLabel> {
  try {
    const out = await ask(CLASSIFY_SYSTEM, text, 500)
    const hit = LABELS.find((l) => out.includes(l))
    if (hit) return hit
  } catch {
    /* 키워드 규칙으로 내려간다 */
  }
  return classifyByKeyword(text)
}
