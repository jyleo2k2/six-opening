import type { Trade } from "../types/trade";

/**
 * 데모 시드 — 엄마의 2주치 거래. 자녀 계정에서 피드가 비어 보이지 않게 한다.
 *
 * 피드 스토어가 아니라 이 파일에 두는 이유: 차트도 이 값을 읽어야 하는데, 차트는
 * app.html 안의 별도 iframe 이다. 피드 스토어를 그대로 import 하면 zustand persist
 * 스토어가 그 iframe 에서도 생성돼 `localStorage` 를 건드린다. 시드는 상태가 아니라
 * 상수이므로 상태와 떼어 둔다.
 *
 * 값은 보관 DB의 실제 종가에 맞춘다. 차트 마커가 체결가를 y 로 쓰므로 시세와 어긋나면
 * 뱃지가 캔들에서 뚝 떨어진 곳에 뜨고, 피드 카드의 금액도 그날 차트와 다르게 보인다.
 * 거래일은 장이 열린 날이어야 한다 — 주말에는 붙일 봉이 없다.
 *
 * 수량은 1인당 가상 100만원 안에서 끝나야 한다. 매수 합계 587,000원.
 */
export const FAMILY_SEED_TRADES: Trade[] = [
  {
    id: "seed-parent-1",
    member: "parent",
    symbol: "005930",
    side: "buy",
    quantity: 2,
    // 삼성전자 KST 2026-08-04(화) 종가 240,000원
    price: 240000,
    reason: "이 회사(제품)를 잘 알아",
    confidence: 75,
    memo: "갤럭시를 오래 써서 사업을 이해하기 쉬웠어.",
    tradedAt: "2026-08-04T01:12:00.000Z",
  },
  {
    id: "seed-parent-2",
    member: "parent",
    symbol: "011200",
    side: "buy",
    quantity: 5,
    // HMM KST 2026-08-06(목) 종가 21,400원
    price: 21400,
    reason: "뉴스에서 봤어",
    confidence: 50,
    memo: "해외 매출 기사를 봤는데 확신까지는 아니었어.",
    tradedAt: "2026-08-06T04:35:00.000Z",
  },
  {
    id: "seed-parent-3",
    member: "parent",
    symbol: "005930",
    side: "sell",
    quantity: 1,
    // 삼성전자 KST 2026-08-07(금) 종가 231,000원
    price: 231000,
    reason: "목표한 만큼 올랐어",
    memo: "처음 생각한 만큼 와서 절반만 정리했어.",
    tradedAt: "2026-08-07T05:02:00.000Z",
  },
];
