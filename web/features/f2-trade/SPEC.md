# F2·F3 — 모의투자·질문식 매매 기능 명세

> **현재 구현 단일 원본** · 2026-08-16 · 기준: PR #305까지 병합된 `main` (iframe 철거 반영)
>
> 현행 동작을 설명할 때는 **프론트 실제 동작 → 프론트가 호출하는 백엔드 계약 → 문서** 순으로 판단한다. 제품 목표·법무·전역 레드라인은 `docs/영웅키움_기획_통합문서_v2.md`를 따르되, 이 문서에 구현 완료라고 적으려면 실제 소비 코드가 있어야 한다.

## 1. 현재 소유권

| 영역 | 실제 위치 | 현재 책임 |
|---|---|---|
| 탐색·상세·매수·매도·질문식 기록·계좌 | `web/features/f0-home/`(`ExploreScreen`·`DetailScreen`·`OrderScreen`·`PortfolioScreen`과 `lib/`) | 화면과 `kw_proto_v1` 즉시 상태의 정본. 값 계산은 `lib/`의 순수 함수가 하고 컴포넌트는 붙이기만 한다 |
| 지갑 시드·복원·총자산 | `web/shared/store/prototype-account.js` | 화면과 서버 경로가 같이 쓰는 단일 원본. `.js`인 것은 옛 iframe 사본 때문이었고 지금은 그냥 공용 모듈이다 |
| 화면 호스트 | `web/features/f0-home/ConnectedPrototype.tsx` | 화면 선택과 F10 오버레이 조립. iframe은 철거했다 |
| 상세 차트 | `web/features/f2-trade/TradingViewChart.tsx` | 분·일·주, 선·캔들 전환과 가족 체결 마커 |
| 차트 라우트 | `web/app/tradingview-chart/page.tsx` | `ChartScreen`이 iframe으로 여는 차트 문서. 앱에 남은 유일한 iframe이다 |
| 유니버스·시세 | `web/app/api/universe/`, `web/app/api/quote/` | 51종 데이터, 현재가·캔들, 키움/캐시/픽스처 폴백 |
| 공개 뉴스 | `web/features/f2-trade/lib/news/`, `web/app/api/news/` | 저장된 게시 뉴스의 런타임 계약과 공개 조회 |
| 서버 거래·행동 저장 | `web/app/api/trade/`, `web/app/api/tab-view/` | 로그인 세션과 화면 계정이 맞을 때 Supabase에 후행 저장 |
| F9 계산 | `web/app/api/profile/`, `web/shared/engine/behavior-profile.ts` | 화면이 보낸 로컬 상태와 시드를 엔진 입력으로 변환 |
| F3 폴더 | `web/features/f3-reason/` | 현재 가드만 존재. 런타임 컴포넌트 없음 |

주문·기록 폼은 `f2-trade`나 `f3-reason`이 아니라 `f0-home/OrderScreen.tsx`에 있다. 폼을 옮길 때는 화면, 상태, 이벤트 생산자와 소비자를 한 계약으로 옮긴다.

## 2. 런타임 구조

```text
GET / · /explore · /portfolio · /ranking · /archive · /stock/{code} · /buy|sell/{code}
  → [[...screen]]/page.tsx  (로그인 없으면 LoginGate)
    → ConnectedPrototype → f0-home 의 React 화면
      ├─ 홈·탐색·상세·차트·뉴스·매수·매도·계좌·랭킹·아카이브
      ├─ localStorage["kw_proto_v1"] 즉시 저장
      ├─ /api/universe + /api/universe/data
      ├─ /api/news + /api/news/{newsId}
      ├─ /api/account · /api/orders → 서버 계좌·미체결 주문
      └─ /api/trade · /api/tab-view → 조건부 후행 저장
    → ChartScreen 안 /tradingview-chart iframe
      ├─ /api/quote/{symbol}/chart
      └─ /api/trades?symbol={symbol}
```

- **주소가 화면을 가리킨다.** 아는 주소는 `features/f0-home/screen-route.ts`의 `routeFromPath`가 정하고 모르는 주소는 404다. `/stocks`·`/trade/[symbol]` 라우트는 없다.
- 화면 전환은 라우터가 소유한다. 컴포넌트는 `onLeave(path)`로 올리고 `ConnectedPrototype`이 처리한다 — 예전의 `kiwoom:screen`·`leaveToRoute()` 메시지 왕복은 iframe과 함께 사라졌다.
- 화면은 `/api/universe/data`를 5초마다 다시 읽어 현재가와 스파크라인을 갱신한다.
- 차트 기간·유형은 iframe을 다시 열지 않고 `kiwoom:chart-options` 메시지로 바꾼다.
- 화면 즉시 상태는 로컬 저장이 우선이다. 서버 저장 실패가 화면 거래를 롤백하지 않으므로 두 저장소가 항상 같다고 가정할 수 없다.

## 3. 확정된 현재 동작

- 국내주식 화이트리스트 51종을 검색·13개 업종 칩·카드 덱으로 탐색한다.
- 부모와 자녀 상태는 각각 가상 **1,000만원**으로 시작한다. 메인 화면의 자녀 이름은 `김찬영`, 부모 이름은 `엄마`다.
- 메인 화면에는 전역 계정 전환 UI가 연결돼 있지 않아 초기 `child` 계정으로 시작한다. 부모 시드 상태는 존재하지만 메인 화면에서 전환할 수 없다.
- 자녀 거래 잠금은 거래일 09:00 이상 15:30 미만이며 부모는 잠기지 않는다. 개발 패널에서 자동·학교시간·하교후를 강제할 수 있다.
- 정규장 시장가는 화면에서 즉시 체결한다. 장외 시장가는 다음 거래일 시가 예약으로 접수한다. 지정가는 대기 주문으로만 기록하며 가격 도달 자동 체결은 없다.
- 매수는 금액 또는 주 수로 입력한다. 금액 입력은 소수점 주식을 허용하고, 주 수 입력은 주문가격 기준 예상 금액과 최대 주 수를 표시한다.
- 매도도 주 수 또는 금액으로 입력하며 보유 수량을 상한으로 보정한다.
- `FEE = 0.00015` 상수(`shared/store/prototype-account.js`)는 선언돼 있지만 주문 금액·잔액·매도대금 계산에는 쓰이지 않는다. 수수료·세금이 반영됐다고 안내하지 않는다.
- 단일종목 한도와 건별 부모 승인은 없다. 현금·보유수량 초과만 화면에서 막는다.

## 4. 사용자 흐름

### 4.1 탐색·상세

1. 홈 또는 하단 `모의투자`에서 탐색 화면으로 간다.
2. 검색·업종·상승순·관심 목록으로 51종을 탐색한다.
3. 상세에서 현재가·등락·회사 설명·게시 뉴스·매수/매도 버튼을 본다.
4. 차트 상세는 `/tradingview-chart`, 뉴스 상세는 같은 `newsId`의 `/api/news/{newsId}`를 사용한다.

차트·뉴스 상세 진입은 `events`에 남고 닫을 때 `dwell_ms`가 붙는다(F9 입력). 현재 화면에는 별도 기업정보 상세 진입이 없어 `info_detail_opened`는 생산되지 않는다.

이와 별개로 기업정보(상세 화면 자체)·차트·뉴스 세 카테고리 중 하나에서 10초 이상 머물다 나가면 그 종목의 방문 목록에 쌓인다(종목별로 계속 누적, 카테고리 재방문마다 상한 없이 더해짐). 다른 종목의 상세를 보는 동안에도 메모리에 남아 있다가 그 종목을 나중에 실제로 사면 그때 함께 전송되고, 새로고침하면 사라진다(로컬 저장소에는 남기지 않음). 시장가 매수가 실제로 체결되는 순간에만 그 종목에 쌓인 방문 목록을 서버로 보내고 비운다 — 매수 화면 진입이나 장외 예약 접수가 아니라 체결이 기준이다. 지정가는 자동 체결되지 않아 이 저장 대상이 되지 않는다.

### 4.2 매수 — 3단계

1. **얼마나 살까**: 금액/주 수, 시장가/지정가를 고른다.
2. **왜, 얼마나 오래**: 이유 1개와 보유계획 1개를 고르고 한 줄 메모를 선택 입력한다. 사용자가 정한 목표가격 계획이면 +5%·+10%·+20% 중 하나를 추가 선택한다.
3. **주문 완료**: 정규장 시장가는 체결, 장외 시장가는 다음 거래일 시가 예약, 지정가는 대기 주문으로 표시한다.

### 4.3 매도 — 3단계

1. **얼마나 팔까**: 주 수/금액, 시장가/지정가를 고른다.
2. **사던 날의 나**: 연결된 최근 매수 기록과 수익률을 보여 주고 매도 이유를 고른다. 처음 계획과 다르면 변경 이유도 필수다.
3. **매도 완료**: 정규장 시장가는 체결, 장외 시장가는 다음 거래일 시가 예약, 지정가는 대기 주문으로 표시한다. 한 줄 메모는 별도 저장한다.

## 5. 질문식 기록 계약

### 5.1 매수 이유 — 필수, 6개

| 화면 문구 | 코드 |
|---|---|
| 뉴스에서 봐서 | `buy_news` |
| 그래프가 좋아 보여서 | `buy_chart` |
| 내가 아는 회사라서 | `buy_familiar` |
| 인기 순위에서 봐서 | `buy_ranking` |
| 친구·가족이 말해줘서 | `buy_social` |
| 그냥 느낌이 좋아서 | `buy_intuition` |

선택지 순서는 세션마다 섞고 크기·색의 우열을 두지 않는다.

### 5.2 보유계획 — 필수, 4개

| 화면 문구 | 코드 | 추가 값 |
|---|---|---|
| 이번 주만 | `plan_short` | 없음 |
| 시즌 끝까지 | `plan_season` | 없음 |
| 내가 정한 목표 가격이 되면 | `plan_target` | `plan_target_price` |
| 아직 모르겠어 | `plan_none` | 없음 |

`plan_target`은 사용자가 자신의 보유계획을 기록하는 입력이다. AI가 목표가를 추천·생성하는 기능과는 다르다.

### 5.3 매도 이유 — 필수, 6개

| 화면 문구 | 코드 |
|---|---|
| 목표한 만큼 와서 | `sell_target_hit` |
| 정한 날짜가 돼서 | `sell_plan_time` |
| 더 좋아 보이는 회사를 찾아서 | `sell_rebalance` |
| 더 떨어질까 봐 | `sell_fear_drop` |
| 그냥 불안해서 | `sell_anxiety` |
| 다른 데 쓸 돈이 필요해서 | `sell_liquidity` |

계획과 다른 매도에는 `change_new_info`·`change_view_shift`·`change_price_emotion`·`change_alternative`·`change_plan_revision` 중 하나를 함께 저장한다.

### 5.4 제외된 입력

- 확신도·자신감 수치는 화면, `kw_proto_v1`, 서버 거래 요청 어디에도 없다.
- AI가 제안하는 목표가·손절가·매매시점·수익률 전망은 금지한다.
- 질문식 답변으로 주문을 허용하거나 차단하지 않는다.

## 6. 로컬 데이터 계약

### 6.1 매수 기록

```ts
type PrototypeBuyRecord = {
  order_id: string;
  user_id: "child_minji" | "parent_mom";
  symbol: string;
  amount_krw: number;
  qty: number;
  order_type: "market" | "limit";
  limit_price: number | null;
  order_status: "filled" | "pending" | "scheduled" | "rejected" | "cancelled";
  scheduled_for?: string;
  filled_at?: string;
  filled_price?: number;
  rejection_reason?: "opening_price_exceeds_reserved_cash";
  reason_code: string;
  plan_code: string;
  plan_target_price: number | null;
  memo: string | null;
  ts: string;
};
```

### 6.2 매도 기록

```ts
type PrototypeSellRecord = {
  order_id: string;
  user_id: "child_minji" | "parent_mom";
  symbol: string;
  qty: number;
  linked_buy_order_id: string | null;
  order_type: "market" | "limit";
  limit_price: number | null;
  order_status: "filled" | "pending" | "scheduled" | "rejected" | "cancelled";
  amount_krw?: number;
  scheduled_for?: string;
  filled_at?: string;
  filled_price?: number;
  sell_reason_code: string;
  plan_match: boolean | null;
  change_reason_code: string | null;
  badge_awarded: boolean;
  retro_card_viewed_ms: number;
  pnl_pct_at_sell: number;
  held_days: number;
  avg: number;
  memo: string | null;
  ts: string;
};
```

저장은 두 덩어리다. `localStorage["kw_proto_v1"]`에는 오래 남는 `acc`, `records`, `sellRecords`, `events`, `seq`, `watchlist`만 저장한다(배지는 폐기돼 더 저장하지 않는다). 화면 임시값 `screen`·`account`·`code`·`draft`·`sellDraft`·`buyStep`·`sellStep`·`arcTab`은 `sessionStorage["kw_proto_ui_v1"]`에 따로 둔다.

화면 임시값은 **앱 안에서 화면을 옮길 때만** 되살린다. `leaveToRoute()`가 `sessionStorage["kw_proto_nav_v1"]` 표시를 남기고, 복원한 쪽이 그 표시를 바로 지운다. 표시가 없는 진입(F5·새 탭·주소 직접 입력)에서는 임시값을 버려 **새로고침하면 처음부터** 동작을 지킨다. 학교시간 개발 설정은 어느 쪽에도 저장하지 않는다.

읽는 쪽은 `shared/store/prototype-account.js`의 `restorePrototypeState()` 하나이고 **첫 렌더 전에** 부른다. `componentDidMount`에서 되살리면 화면을 옮길 때마다 시드 지갑이 한 프레임 먼저 보였다 바뀐다.

### 6.3 대기 주문 — 원본은 서버다

미체결 주문(지정가 대기·장외 예약)은 **`transactions`가 유일한 원본**이다. 화면은 예약을 만들지도, 정산하지도 않는다. 브라우저를 지워도 예약이 살아 있어야 하고, 예약이 잡아 둔 현금·수량도 서버가 잠가야 하기 때문이다.

- 접수는 `POST /api/orders` 하나다. `reserve_order`가 한 트랜잭션에서 매수는 현금(`account.reserved_balance`), 매도는 수량(`holdings.reserved_quantity`)을 잠근다. 잔고를 직접 깎지 않으므로 예약·취소가 총자산을 바꾸지 않는다.
- **접수가 실패하면 주문은 없던 일이다.** 화면은 완료 화면으로 넘어가지 않고 확인 단계에 남아 거절을 알린다. 로컬 현금·보유·`pending`은 어느 쪽으로도 움직이지 않는다.
- 조회는 `GET /api/orders`다. 응답을 `pendingFromServerOrders()`가 화면이 쓰던 `pending` 모양(`kind`·`side`·`reservedAmount`·`reservedQty`·`reservationMode`)으로 바꾸므로, 사용 가능 수량 계산과 카드 렌더는 그대로다.
- 정산도 그 조회가 겸한다. 예약일 이후 `volume > 0`인 첫 일봉만 실제 거래가 확인된 날로 인정하고 그 봉의 `open`으로 `settle_order`를 부른다. 휴일·거래정지·데이터 실패에는 체결하지 않는다. `settle_order`는 멱등이라 같은 주문을 두 번 불러도 중복 체결되지 않는다.
- 금액 매수는 예약 금액 전부를 `예약 금액 / 시가`의 소수 수량으로 바꾼다. 수량 매수는 실제 시가 필요액이 예약액보다 크면 거절하고 전액 반환하며, 작으면 차액을 반환한다. 이 규칙은 이제 `settle_order` SQL이 소유한다.
- 취소는 `DELETE /api/orders?id=`다. `cancel_order`가 `user_id`까지 대조해 남의 주문을 못 지우게 하고, 잠긴 자원을 같은 트랜잭션에서 푼다. 화면은 취소 뒤 목록을 다시 읽는다.
- 화면 상태에는 **접수 뒤 서버에서 읽어 온 목록만** 들어간다. `localStorage`의 `acc.{account}.pending`은 조회에 실패했을 때만 남는 캐시이며, 매수·매도 화면은 여기에 쓰지 않는다.

## 7. 백엔드 연결 상태

| 경로 | 프론트 소비 | 현재 의미 |
|---|---|---|
| `GET /api/universe` | 연결 | 부팅 시 `window.KW_UNIVERSE` 스크립트 제공 |
| `GET /api/universe/data` | 연결 | 5초 현재가·스파크 갱신 |
| `GET /api/quote/{symbol}/chart` | 연결 | TradingView 캔들 데이터 |
| `GET /api/news`, `GET /api/news/{id}` | 연결 | 게시 상태 뉴스만 공개 |
| `GET /api/account` | 연결 | 로그인 직후와 매매 성공 직후 `applyServerHoldings`가 서버 잔액·보유를 `state.acc[role]`에 반영. 화면의 `cash`는 총 현금(`balance`)이 아니라 **주문가능금액(`available` = `balance` − 잠긴 현금)**이다. 로그인한 역할만 덮어쓰고 반대쪽 로컬 데모 데이터는 그대로 둠 |
| `POST /api/trade` | 조건부 연결 | 정규장 시장가와 장외 예약 시장가의 실제 체결만 best-effort 전송. 응답 실패 시 로컬 거래는 유지되고 서버 재조회는 하지 않음 |
| `POST /api/tab-view` | 조건부 연결 | 종목별 기업정보·차트·뉴스 방문 중 10초 이상인 것만 서버가 다시 세어 매수 체결 시 최종 개수 저장 |
| `GET /api/profile/season-cards` | 연결 | 아카이브 진입 시 캐릭터 카드와 지난 주차 카드를 조회. **성향 값의 유일한 원본이다** — `GET /api/profile/behavior`는 2026-08-16 삭제됐다 (F9 SPEC §3.2·§6.11) |
| `GET·POST·DELETE /api/orders` | 연결 | 미체결 주문의 유일한 원본(§6.3). `POST`는 지정가·장외 예약 접수, `GET`은 목록 조회 겸 만기 예약 정산, `DELETE`는 취소. 화면은 `useWallet()`으로만 부른다 |
| `POST·DELETE /api/auth/login` | 연결 | 로그인은 `LoginGate`, 로그아웃은 `HomeScreen`의 메뉴 |

`POST /api/trade`는 `dbUser`가 있고 메인 화면의 `account`가 서버 프로필 역할과 같을 때만 보낸다. 화면 계정 스위처가 없으므로 부모 역할 거래의 실제 서버 생산 경로는 현재 사용자 UI에 없다. 같은 조건에서 응답이 200이면 `loadDbUser()`를 다시 호출해 홈 화면 보유종목을 서버 값으로 재동기화한다.

### 7.1 서버 거래 저장 계약

`POST /api/trade` 요청 본문. §5의 질문식 기록을 로컬(`kw_proto_v1`)과 서버에 **같이** 남긴다. 이전에는 `reason`만 서버로 갔고 계획·목표가·메모·계획 변경 이유는 로컬에만 있어서, 서버 `transactions`로 카드를 다시 만드는 경로(F9 지난 주차 카드 `GET /api/profile/season-cards`)에서 그 값들이 비어 있었다.

| 필드 | 타입 | 매수 | 매도 | 저장 위치 |
|---|---|---|---|---|
| `side` | `"buy" \| "sell"` | 필수 | 필수 | `transactions.side` |
| `stock_code` | `string` 6자리 | 필수 | 필수 | `transactions.stock_id` (코드→id 변환) |
| `price` | `number > 0` | 필수 | 필수 | `transactions.trade_price` |
| `quantity` | `number > 0` | 필수 | 필수 | `transactions.trade_quantity` |
| `reason` | `string \| null` | §5.1 이유 코드 | §5.3 이유 코드 | `transactions.trade_reason` |
| `plan_code` | `string \| null` | §5.2 계획 코드 | 항상 `null` | `transactions.plan_code` |
| `plan_target_price` | `number > 0 \| null` | `plan_target`일 때만 | 항상 `null` | `transactions.plan_target_price` |
| `memo` | `string \| null` | 선택 입력, 최대 200자 | 항상 `null` | `transactions.memo` |
| `plan_match` | `boolean \| null` | 항상 `null` | 계획 준수 판정, 판정 불가면 `null` | `transactions.plan_match` |
| `plan_changed_reason` | `string \| null` | 항상 `null` | `plan_match === false`일 때 §5.3 변경 코드 | `transactions.plan_changed_reason` |

- 계획 코드는 §5.2와 같은 `plan_short`·`plan_season`·`plan_target`·`plan_none` 네 개다. 변경 코드는 §5.3의 `change_*` 다섯 개다.
- 값 검증은 Route Handler가 한다. 목록에 없는 `plan_code`·`plan_changed_reason`, 0 이하 `plan_target_price`, 200자 초과 `memo`는 **주문 전체를 거절하지 않고 그 필드만 `null`로 떨어뜨린다.** 서버 저장은 best-effort이고 로컬 체결이 이미 끝났으므로 부가 필드 하나 때문에 체결 기록을 통째로 잃지 않는다.
- 매수 전용 필드를 매도가 보내거나 그 반대인 경우도 같은 방식으로 무시한다.
- `apply_trade` RPC가 이 값들을 한 트랜잭션에서 함께 넣는다. 새 파라미터는 모두 `default null`이라 옛 여섯 인자 호출도 그대로 동작한다.
- **확신도·자신감 수치는 이 요청 본문에도 없다** (§5.4).

소비자는 다음과 같다.

| 경로 | 새 필드 사용 |
|---|---|
| `GET /api/profile/season-cards` | 매도의 `plan_match`를 엔진 `ProfileSell.planMatch`로 넘긴다. 이전에는 항상 `null`이라 `actionAlignment`가 늘 0이었다 |
| `GET /api/family` | 거래 카드에 `planCode`·`planTargetPrice`·`memo`·`planMatch`·`planChangedReason`을 실어 아카이브 수익률 탭 피드가 계획과 메모를 그린다 |
| `GET /api/trades` | 같은 필드를 함께 준다. 차트 마커 계산(`ChartTrade`)은 이 값을 쓰지 않는다 |

타인의 `price`·`quantity`를 가리는 규칙은 그대로다. 이유·계획·메모는 자산 규모를 드러내지 않으므로 가리지 않는다.

### 7.2 어린이 뉴스 공개 계약

- 원문 후보와 어린이용 노출문은 하나의 `news_id` 묶음으로 저장한다.
- 종목 화면의 짧은 뉴스 카드와 자세히보기 제목은 같은 `news_id`의 동일한 `headline`을 사용한다. 자세히보기는 여기에 정확히 3개의 요약 줄을 붙이며, 종목명으로 상세 기사를 다시 조회하지 않는다.
- 종목 화면에는 해당 종목이 주인공인 `company` 뉴스만 노출한다. 해당 종목의 검수 통과 뉴스가 없을 때 `market` 범위의 코스피 시황으로 대신 채우지 않는다.
- 제목·홈 요약·세 줄 요약은 각각 같은 기사의 선별된 원문 근거 문장을 한 개 이상 참조해야 한다. 다른 기사의 근거나 선별에서 제외한 문장은 참조할 수 없다.
- 회사 기사는 원문·선별자·독립 검수자의 주인공 종목 집합과 사건 유형이 모두 같아야 한다. 비교 기사처럼 원문 주인공이 여러 곳이면 한 회사만 떼어 저장하지 않는다.
- 결정적 숫자·날짜 검사와 독립 검수 11개 항목을 모두 통과한 `ready_for_storage`만 저장 후보가 되고, `published`만 화면에 노출한다.
- 브라우저는 Supabase를 직접 호출하지 않는다. 서버 전용 `/api/news`가 공개 필드만 반환하며, 원문 URL은 같은 뉴스 묶음에 저장된 값만 사용한다.

## 8. F9·F10 전달 경계

- F9 `/api/profile`은 로컬 체결 매수, 매도, 차트·뉴스 체류 이벤트, 보유·현금을 읽는다. 미체결 매수는 제외한다.
- F10 브리지는 `order_method_selected`, 매수 2단계 이탈을 변환한 `buy_confirmation_abandoned`, 실제 시장가 체결의 `trade_filled`만 받는다. 예약 접수는 체결 이벤트가 아니며, 매도 이탈은 현재 브리지에서 버린다.
- `order_method_selected`는 같은 `orderFlowId` 안의 시장가↔지정가 전환을 전달한다.
- 챗봇 대화 원문은 F9 계산 입력이 아니다.

## 9. 현재 알려진 불일치·미완료

- 지정가 자동 체결 스케줄러가 없다.
- 메인 화면에 전역 부모↔자녀 스위처가 없다. 계정 전환은 로그아웃 후 재로그인으로 확정됐고 `/api/auth/switch`는 PR #221에서 삭제했다.
- `POST /api/trade` 응답이 실패하면 로컬 거래와 Supabase 거래가 재조정되지 않는다(성공 시에는 `applyServerHoldings`가 재동기화한다).
- 미체결 주문은 서버로 옮겼지만(§6.3) **체결된 거래 기록은 아직 두 갈래다.** 정규장 시장가 체결은 여전히 로컬 `records`·`sellRecords`가 먼저고 `POST /api/trade`가 best-effort다.
- 예약 주문의 로컬 그림자 기록이 상태를 따라가지 않는다. 접수할 때 남긴 `records`의 `order_status`는 `pending`·`scheduled`에 머무르고, 서버가 체결·취소해도 `filled`로 바뀌지 않는다. 매도 화면 회고 카드(`lastBuy`)는 그 기록을 그대로 쓰므로 화면은 맞다. 성향 계산은 `GET /api/profile/season-cards`가 DB를 보므로 영향이 없다 — 로컬 기록으로 성향을 재계산하던 경로는 2026-08-16 삭제됐다.
- 예약 정산 트리거가 조회에 붙어 있다. 아무도 앱을 열지 않으면 만기 예약이 정산되지 않는다 — 배치가 필요하면 `settleDueOrders`를 그대로 쓰면 된다.
- 거래를 읽는 서버 경로는 전부 `order_status='filled'`을 걸러야 한다(`app/api/supabase.ts`의 `selectFilledTrades`). 주문 자체를 다루는 `api/orders`만 예외로 `selectRows`를 직접 쓴다.
- F11 어댑터는 매도 기록에 `amount_krw`가 없어 시장가 매도 카드 단가를 0원으로 만들 수 있다.

## 10. 완료 기준

- `탐색 → 상세 → 매수/매도 → 질문식 기록 → 정규장 시장가 체결 또는 장외 시장가 예약`이 React 화면에서 동작한다.
- 1,000만원 지갑, 이유·계획 코드, 로컬 저장 모양이 이 문서와 일치한다.
- 지정가는 대기 상태로 표시되고 자동 체결된 것처럼 설명하지 않는다.
- 주말·휴장·시가 데이터 없음·가격 갭·취소·새로고침·중복 처리에서 예약 현금과 수량이 보존된다.
- 프론트에서 소비하지 않는 API는 구현 완료 UI로 표기하지 않는다.
- 관련 단위 테스트와 `web/`의 `npm test`, `npm run build`가 통과한다.
