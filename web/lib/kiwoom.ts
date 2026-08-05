// 키움 REST API 클라이언트 (모의투자).
//
// ⚠️ 아래 상수는 반드시 키움 REST API 문서로 대조 확인할 것.
//    구조(토큰 발급 → 주문)는 일반 HTTP지만, 경로와 api-id는 문서 기준이 정답이다.
//    체결 왕복을 뚫는 것이 백엔드 1순위 작업이고, 막히면 시연 시나리오 전체가 무너진다.

const HOST =
  process.env.KIWOOM_MOCK === '0'
    ? 'https://api.kiwoom.com'
    : 'https://mockapi.kiwoom.com'

const PATH_TOKEN = '/oauth2/token'
const PATH_ORDER = '/api/dostk/ordr'
const API_ID_BUY = 'kt10000'
const API_ID_SELL = 'kt10001'

let cached: { token: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token

  const appkey = process.env.KIWOOM_APP_KEY
  const secretkey = process.env.KIWOOM_SECRET_KEY
  if (!appkey || !secretkey) {
    throw new Error('KIWOOM_APP_KEY / KIWOOM_SECRET_KEY 가 설정되지 않았습니다')
  }

  const res = await fetch(HOST + PATH_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ grant_type: 'client_credentials', appkey, secretkey }),
  })
  if (!res.ok) {
    throw new Error(`키움 토큰 발급 실패 ${res.status}: ${await res.text()}`)
  }

  const body = (await res.json()) as { token?: string; expires_dt?: string }
  if (!body.token) throw new Error(`토큰 응답에 token 없음: ${JSON.stringify(body)}`)

  cached = { token: body.token, expiresAt: Date.now() + 30 * 60_000 }
  return body.token
}

export interface OrderResult {
  orderNo: string
  filledPrice: number
  filledQty: number
}

/** 시장가 주문. 승인된 제안서만 여기까지 온다 */
export async function placeOrder(params: {
  kind: 'buy' | 'sell'
  stockCode: string
  qty: number
  /** 체결가 회신용. 시세 API를 붙이기 전까지는 제안 시점 가격을 넘긴다 */
  refPrice: number
}): Promise<OrderResult> {
  const token = await getToken()

  const res = await fetch(HOST + PATH_ORDER, {
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'api-id': params.kind === 'buy' ? API_ID_BUY : API_ID_SELL,
    },
    body: JSON.stringify({
      dmst_stex_tp: 'KRX',
      stk_cd: params.stockCode,
      ord_qty: String(params.qty),
      ord_uv: '',
      trde_tp: '3', // 시장가
    }),
  })
  if (!res.ok) {
    throw new Error(`키움 주문 실패 ${res.status}: ${await res.text()}`)
  }

  const body = (await res.json()) as { ord_no?: string; return_msg?: string }
  if (!body.ord_no) {
    throw new Error(`주문 응답에 주문번호 없음: ${body.return_msg ?? JSON.stringify(body)}`)
  }

  return { orderNo: body.ord_no, filledPrice: params.refPrice, filledQty: params.qty }
}
