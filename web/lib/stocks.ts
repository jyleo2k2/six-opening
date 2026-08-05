// 화이트리스트 + 검수 카피(기획안 6-1, 7장).
// 런타임 LLM 호출 없음 — 종목이 고정이므로 사람이 검수한 고정문을 그대로 쓴다.
//
// 금지 표현 체크리스트(검수 시 기계적으로 거른다):
//   좋다 / 나쁘다 / 오를 것 / 내릴 것 / 추천 / 유망 / 안전 / 손해 안 봐
//
// ponytail: price는 시연용 시드값. 키움 시세 API 붙이면 여기 대신 실시간 조회로 교체.

import type { Stock } from './types'

export const STOCKS: Stock[] = [
  {
    code: '005930',
    name: '삼성전자',
    line1: '반도체와 스마트폰을 만드는 회사예요.',
    line2: '네 폰이나 집 TV에 이 회사 부품이 들어 있을 수 있어요.',
    price: 74_800,
  },
  {
    code: '000660',
    name: 'SK하이닉스',
    line1: '컴퓨터가 기억을 저장하는 부품을 만들어요.',
    line2: '게임을 빠르게 돌아가게 해 주는 메모리가 이 회사 것이에요.',
    price: 189_500,
  },
  {
    code: '035420',
    name: 'NAVER',
    line1: '검색과 웹툰, 지도를 만드는 인터넷 회사예요.',
    line2: '숙제하다 검색할 때, 웹툰 볼 때 이 회사 서비스를 써요.',
    price: 213_000,
  },
  {
    code: '035720',
    name: '카카오',
    line1: '메신저와 지도, 게임을 만드는 회사예요.',
    line2: '엄마 아빠랑 주고받는 메시지 앱이 이 회사 거예요.',
    price: 41_250,
  },
  {
    code: '005380',
    name: '현대차',
    line1: '자동차를 만들어서 전 세계에 파는 회사예요.',
    line2: '길에서 보는 자동차 중 많은 수가 이 회사가 만든 거예요.',
    price: 232_000,
  },
  {
    code: '069500',
    name: 'KODEX 200',
    line1: '한국에서 큰 회사 200곳을 한 번에 조금씩 사는 상품이에요.',
    line2: '한 회사만 고르기 어려울 때, 여러 회사에 나눠 담는 방법이에요.',
    price: 38_900,
  },
]

// 예습 모드(기획안 4장 #8)용 3개월 전 종가.
// ponytail: 시드값. 키움 일봉 API 붙이면 조회로 교체 — 화면 계약은 그대로 간다.
const PRICE_3M_AGO: Record<string, number> = {
  '005930': 68_200,
  '000660': 164_000,
  '035420': 229_500,
  '035720': 44_800,
  '005380': 218_500,
  '069500': 36_100,
}

export function priceThen(code: string): number | undefined {
  return PRICE_3M_AGO[code]
}

const byCode = new Map(STOCKS.map((s) => [s.code, s]))

export function findStock(code: string): Stock | undefined {
  return byCode.get(code)
}

export function isWhitelisted(code: string): boolean {
  return byCode.has(code)
}

/** ③ "지금 1주 = 무엇 값" — LLM이 아니라 계산으로 만든다 */
export function priceInKidTerms(price: number): string {
  const items: [number, string][] = [
    [500_000, '자전거 한 대'],
    [100_000, '운동화 한 켤레'],
    [30_000, '치킨 한 마리'],
    [5_000, '아이스크림 한 개'],
  ]
  for (const [unit, label] of items) {
    const n = Math.floor(price / unit)
    if (n >= 1) return `${label} ${n}개 값이에요`
  }
  return '아이스크림 한 개보다 싸요'
}
