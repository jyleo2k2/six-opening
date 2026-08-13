# F11 — 가족 거래 피드 기능 명세

> **기능 단일 원본** · 2026-08-14 · 현재 `web/` 구현 기준
>
> 이 문서는 희망 설계가 아니라 현재 사용자가 실제로 만나는 동작을 기록한다. 충돌 시 프론트 구현 → 백엔드 계약 → 이 문서 순으로 확인한다.

## 1. 현재 사용자 경험

- 가족 기록은 별도 라우트가 아니라 `/`의 React 오버레이 `FeedScreen`으로 열린다.
- `kw_proto_v1`에서 읽은 프로토타입 거래와 코드 시드 가족 거래를 합쳐 최신순으로 보여준다.
- `민지로 보기` / `엄마로 보기` 전환은 **피드 안에서 누구 기준으로 금액을 가릴지만** 바꾼다. 메인 앱 계정·세션·잔고는 바꾸지 않는다.
- 자신의 카드에는 수량과 `trade.price`를 원 단위로 표시하고, 다른 가족 카드에는 둘 다 숨긴다.
- 코멘트는 브라우저 로컬 상태에 저장하며 부모→자녀 방향의 추천·타이밍·훈계·채점 표현을 차단한다.
- `차트에서 이 지점 보기`는 현재 차트가 아니라 iframe의 **종목 상세 화면**을 연다.
- 좋아요 UI, 코멘트 삭제 UI, 서버 코멘트 동기화는 노출되지 않는다.

## 2. 소유권

| 위치 | 현재 책임 |
|---|---|
| `web/features/f11-feed/FeedScreen.tsx` | 피드 오버레이, 카드, 열람 기준 전환, 코멘트 입력 |
| `web/features/f0-home/ConnectedPrototype.tsx` | F11 열기·닫기, `kiwoom:open-stock` 중계 |
| `web/shared/store/prototype-trades.ts` | `kw_proto_v1`의 체결 기록을 `Trade`로 변환 |
| `web/shared/store/use-family-feed-store.ts` | 열람 기준, 가족 시드 거래, 로컬 코멘트의 Zustand 저장소 |
| `web/shared/store/family-trade-seed.ts` | 가족 거래 시드 |
| `web/shared/engine/comment-filter.ts` | 클라이언트 코멘트 게이트 |
| `web/shared/engine/trade-markers.ts` | 차트 마커 데이터 변환 |
| `web/app/api/trades/route.ts` | 세션 가족의 종목별 체결 조회와 타인 수량 마스킹 |
| `web/app/api/comments/route.ts` | 서버 코멘트 조회·작성·삭제 계약 |
| `web/app/api/likes/route.ts` | 서버 좋아요 조회·토글 계약 |

F11은 F10과 함께 iframe 밖 React 오버레이이다. 메인 화면 정본은 계속 `web/public/ui/app.html`에 있다.

## 3. 프론트 데이터 흐름

### 3.1 본인 거래

`FeedScreen`이 열릴 때 `readPrototypeTrades()`를 한 번 호출한다.

| `kw_proto_v1` | `Trade` 변환 |
|---|---|
| `records` / `sellRecords` | `side: "buy"` / `"sell"` |
| `user_id` | `member` 추론 |
| `amount_krw / qty` 또는 저장 단가 | `price` |
| 이유 코드 | 한글 `reason` |
| `order_status: "pending"` | 피드에서 제외 |

### 3.2 가족 거래와 코멘트

`useFamilyFeedStore`는 `kiwoom-family-feed` 키로 아래 상태를 브라우저에 저장한다.

- `viewer`: 기본값 `child`
- `familyTrades`: 코드 시드
- `comments`: 코드 시드와 사용자가 남긴 코멘트

현재 피드 라벨은 `민지`·`엄마`이고, 메인 프로토타입의 자녀 이름 `김찬영`과 일치하지 않는다.

### 3.3 카드 표시

| 항목 | 현재 동작 |
|---|---|
| 정렬 | `tradedAt` 내림차순 |
| 본인 판정 | `trade.member === viewer` |
| 본인 상세 | `quantity`주 + `formatWon(trade.price)` |
| 타인 상세 | 수량·가격 숨김 |
| 이유·메모 | 있으면 표시 |
| 종목 이동 | `postMessage({ type: "kiwoom:open-stock", symbol })` → 종목 상세 |

카드는 `trade.price`를 표시하므로 현재 문구의 금액은 **총 거래금액이 아니라 주당 단가**이다.

## 4. 코멘트 계약

```ts
type TradeComment = {
  id: string;
  tradeId: string;
  author: "child" | "parent";
  body: string;
  createdAt: string;
};
```

- 텍스트만 허용하며 공백은 거절하고 최대 200자이다.
- 현재 작성자는 서버 세션이 아니라 피드의 `viewer` 값이다.
- 부모가 자녀 거래에 남길 때만 추천·매매 타이밍·훈계·채점 표현을 게이트한다.
- 차단하면 저장하지 않고 재작성 안내를 보여준다.
- 현재 프론트에는 수정·삭제 기능이 없다.
- 코멘트는 성향 계산과 F10 입력에 사용하지 않는다.

## 5. 차트 가족 체결 마커

`/tradingview-chart`는 `GET /api/trades?symbol={6자리}`만 호출한다. 피드의 로컬 거래·시드는 차트 마커 원본이 아니다.

| 항목 | 현재 계약 |
|---|---|
| 인증 | `kw_uid` 세션, 없으면 401 |
| 범위 | 같은 `family_tag`; 태그가 없으면 본인 |
| 정렬 | `created_at` 오름차순 |
| 수량 | 본인만 값, 타인은 서버에서 `null` |
| 위치 | 체결 시각 이하의 마지막 봉 x좌표 + 체결가 y좌표 |
| 모양 | 자녀/부모 색의 B·S SVG 배지 |
| 상호작용 | 표시 전용, 클릭 없음 |

응답 형식은 `{ trades: ChartTrade[] }`이다. 현재 저장소의 `transactions`에 체결이 없으면 마커가 없는 것이 정상이다.

## 6. 백엔드 구현과 프론트 연결 상태

| 기능 | 서버 | 현재 F11 프론트 |
|---|---|---|
| 가족 체결 조회 | `/api/trades` 구현 | TradingView 차트만 사용 |
| 코멘트 조회·작성·본인 삭제 | `/api/comments` 구현 | **호출하지 않음** |
| 좋아요 조회·토글 | `/api/likes` 구현 | **UI와 호출 없음** |
| 가족 범위 검사 | API에서 구현 | 로컬 피드에는 적용되지 않음 |
| 로그인·계정 전환 | `/api/auth/login`, `/api/auth/switch` 구현 | **호출하지 않음** |

따라서 서버 반응 API가 있다는 사실을 피드 서버 연동 완료로 표현하지 않는다.

## 7. 확인된 불일치와 제약

1. 피드와 차트가 서로 다른 원본을 본다. 피드는 `localStorage + 코드 시드`, 차트는 Supabase `transactions`이다.
2. 피드 열람 기준 전환은 메인 앱 계정이나 `kw_uid`를 바꾸지 않는다.
3. 버튼 문구는 차트를 약속하지만 실제 목적지는 종목 상세이다.
4. 본인 카드의 원 표시는 총액이 아니라 단가이다.
5. 메인 앱 이름 `김찬영`과 피드 이름 `민지`가 다르다.
6. 서버 코멘트·좋아요 API는 프론트에서 사용하지 않는다.
7. 저장소에서 `profiles`, `accounts`, `transactions`, `trade_comments`, `trade_likes`, `apply_trade` 스키마 마이그레이션은 확인되지 않았다. 배포 DB 계약을 별도로 검증해야 한다.

## 8. 현재 완료 기준

- `/`에서 가족 기록 오버레이가 열리고 닫힌다.
- 로컬 체결과 가족 시드가 최신순으로 보이며 pending 주문은 제외된다.
- 열람 기준과 같은 가족 카드에만 수량·단가가 보인다.
- 부모→자녀의 금지 코멘트는 저장되지 않고 안내가 보인다.
- 종목 이동 버튼이 메인 iframe의 해당 종목 상세를 연다.
- 차트 마커는 서버 거래만 표시하고 타인 수량을 노출하지 않는다.
- `web`의 테스트와 빌드가 통과한다.
