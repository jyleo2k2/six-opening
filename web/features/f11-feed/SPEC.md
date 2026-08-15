# F11 — 가족 거래 피드 기능 명세

> **기능 단일 원본** · 2026-08-15 · 기준: PR #217까지 병합된 `main`
>
> 이 문서는 희망 설계가 아니라 현재 사용자가 실제로 만나는 동작을 기록한다. 충돌 시 프론트 구현 → 백엔드 계약 → 이 문서 순으로 확인한다.

## 1. 현재 사용자 경험

- 가족 기록은 별도 라우트도 React 오버레이도 아니다. `app.html` 아카이브 화면의 **수익률(`return`) 탭**이 피드를 소유한다.
- `GET /api/family`가 로그인 세션과 같은 `family_tag`의 구성원과 Supabase 체결을 최신순으로 제공한다.
- `전체`와 실제 구성원 이름 필터로 자녀·부모 각각의 거래를 볼 수 있다. 필터는 로그인 사용자를 바꾸지 않는다.
- 자신의 카드에는 수량과 주당 체결가를 표시하고, 다른 가족 카드에는 서버 응답 단계부터 둘 다 `null`로 숨긴다.
- 코멘트는 Supabase에 저장하며 부모→자녀 방향의 추천·타이밍·훈계·채점 표현을 서버에서 차단한다.
- 코멘트 작성자는 실제 `profiles.name`으로 표시해 엄마·아빠를 구분하고, 본인이 쓴 코멘트만 삭제할 수 있다.
- 좋아요는 가족 전체 개수와 로그인 사용자의 선택 상태를 DB에 저장하며 다시 누르면 취소한다.

## 2. 소유권

| 위치 | 현재 책임 |
|---|---|
| `web/ui-src/screens/archive.html`의 `return` 탭 | 피드 카드, 구성원 필터, 코멘트·좋아요 입력 |
| `web/ui-src/methods/loadFamilyProfiles.js` | `/api/family` 조회와 `dbFamily` 보관 |
| `web/ui-src/methods/loadArchiveFeedReactions.js` | 거래 id 일괄 반응 조회 |
| `web/ui-src/methods/sendArchiveComment.js` · `deleteArchiveComment.js` | 코멘트 작성·본인 삭제 |
| `web/ui-src/methods/toggleArchiveLike.js` | 좋아요 토글 |
| `web/ui-src/methods/buildArchive.js` | 응답이 없을 때의 로컬 데모 폴백 |
| `web/app/api/family/route.ts` | 가족 범위, 구성원 성향, 구성원별 수익률, 전체 체결 조회와 타인 수량·체결가 마스킹 |
| `web/shared/engine/comment-filter.ts` | 서버 저장 전 코멘트 문구 게이트 |
| `web/shared/engine/trade-markers.ts` | 차트 마커 데이터 변환 |
| `web/app/api/trades/route.ts` | 세션 가족의 종목별 체결 조회와 타인 수량 마스킹 |
| `web/app/api/comments/route.ts` | 서버 코멘트 조회·작성·삭제 계약 |
| `web/app/api/likes/route.ts` | 서버 좋아요 조회·토글 계약 |

F11에는 자체 React 화면이 없다(오버레이 `FeedScreen`은 소비자가 없어 삭제됐다). **화면 원본은 `web/ui-src/`이고 `web/public/ui/app.html`은 `node scripts/ui-build.mjs build`가 만드는 생성물이라 직접 고치지 않는다** — 고쳐도 다음 조립 때 사라진다. 이 폴더에는 SPEC과 가드만 남는다.

## 3. 프론트 데이터 흐름

### 3.1 가족 거래

`app.html`의 `componentDidMount`가 앱 부팅 시 `loadFamilyProfiles()`로 `/api/family`를 한 번 호출한다(아카이브 탭 진입 시점이 아니다). 응답은 `dbFamily`에 보관하고 수익률 탭이 그때 표시한다. 서버는 클라이언트가 넘긴 가족값을 받지 않고 세션 사용자의 `family_tag`로 범위를 정한다. 태그가 없으면 본인만 반환한다.

| Supabase / 서버 응답 | `FamilyTrade` 변환 |
|---|---|
| `transactions.side` | `side: "buy"` / `"sell"` |
| `transactions.user_id` + `profiles` | `userId`·`memberName`·`memberRole` |
| `stocks` 관계 | `symbol`·`stockName` |
| 본인 `trade_quantity`·`trade_price` | `quantity`·`price` |
| 타인 `trade_quantity`·`trade_price` | 서버에서 `null` |

### 3.2 가족 반응

가족 거래를 받은 뒤 모든 거래 id를 한 번에 `/api/comments`와 `/api/likes`로 보내 반응을 읽는다. 코멘트 작성·삭제와 좋아요 토글이 성공하면 해당 카드 상태만 서버 응답으로 갱신한다. 거래는 계속 표시하고 반응 API만 실패하면 별도 오류를 보여 준다.

### 3.3 카드 표시

| 항목 | 현재 동작 |
|---|---|
| 정렬 | `tradedAt` 내림차순 후 **최근 12건만** (`slice(0, 12)`) |
| 본인 판정 | `trade.userId === family.viewer.id` |
| 본인 상세 | 주당 체결가를 `won(avg)`로 표시 |
| 타인 상세 | 서버가 가격을 `null`로 주므로 **`비공개`** 문구 |
| 이유 | `trade_reason`, 없으면 빈 상태 문구 |

카드는 `trade.price`를 표시하므로 현재 문구의 금액은 **총 거래금액이 아니라 주당 단가**이다.

## 4. 코멘트 계약

```ts
type FeedComment = {
  id: string | number;
  transactionId: string;
  author: "child" | "parent";
  authorName: string;
  body: string;
  createdAt: string;
  mine: boolean;
};
```

- 텍스트만 허용하며 공백은 거절하고 최대 200자이다.
- 작성자 `user_id`와 이름은 서버 세션 및 `profiles` 관계에서 정한다. 화면이 작성자를 보내지 않는다.
- 부모가 자녀 거래에 남길 때만 추천·매매 타이밍·훈계·채점 표현을 게이트한다.
- 차단하면 저장하지 않고 재작성 안내를 보여준다.
- `mine`인 코멘트만 삭제 버튼을 표시하며 서버가 작성자를 다시 검사한다. 수정 기능은 없다.
- 코멘트는 성향 계산과 F10 입력에 사용하지 않는다.

## 5. 차트 가족 체결 마커

`/tradingview-chart`는 `GET /api/trades?symbol={6자리}`를 호출하고, 가족 피드는 `GET /api/family`를 호출한다. 둘 다 Supabase `transactions`를 원본으로 사용한다.

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
| 가족 전체 체결·구성원·성향 조회 | `/api/family` 구현 | 아카이브 수익률 탭에서 사용 |
| 종목별 가족 체결 조회 | `/api/trades` 구현 | TradingView 차트에서 사용 |
| 코멘트 배치 조회·작성·본인 삭제 | `/api/comments` 구현 | 아카이브 수익률 탭에서 사용 |
| 좋아요 배치 조회·토글 | `/api/likes` 구현 | 아카이브 수익률 탭에서 사용 |
| 가족 범위 검사 | 가족·거래·반응 API에서 구현 | 세션 `family_tag` 기준 응답만 사용 |
| 로그인·로그아웃 | `/api/auth/login` POST·DELETE 구현 | `LoginGate`·`app.html` 메뉴가 호출. 계정 전환은 이 둘로만 한다 |
| 계정 전환 API | `/api/auth/switch` 구현 | **호출하지 않음.** 전용 스위처를 만들지 않기로 확정돼 미사용 경로다 (`docs/기능명세.md` §4.2) |

거래·구성원·코멘트·좋아요는 모두 DB가 원본이다.

## 7. 확인된 불일치와 제약

1. 구성원 필터는 메인 앱 계정이나 `kw_uid`를 바꾸지 않는다. 계정 전환이 아니라 열람 필터다.
2. **본인 카드의 원 표시는 총 거래금액이 아니라 주당 체결가인데 라벨이 그 구분을 하지 않는다.** 매수·매도 양쪽 모두 해당한다. 남의 카드는 서버가 가격을 `null`로 마스킹해 `비공개`로 나오므로 본인 카드에서만 보인다. 라벨을 주당 단가로 명시하거나 `price × quantity`를 찍으면 해소된다.
3. 코멘트 수정과 좋아요를 누른 사람 목록은 제공하지 않는다.

## 8. 현재 완료 기준

- 아카이브 화면의 수익률 탭에서 가족 피드가 보인다.
- 같은 `family_tag`의 자녀·부모 구성원과 DB 체결이 최신순 12건까지 보인다.
- 실제 구성원 이름 필터로 각자의 거래를 따로 볼 수 있다.
- 로그인 사용자의 카드에만 수량·단가가 보이고 타인은 API 응답부터 `null`이다.
- 부모→자녀의 금지 코멘트는 저장되지 않고 안내가 보인다.
- 코멘트 작성자의 실제 이름이 보이고 본인 코멘트만 삭제할 수 있다.
- 좋아요 개수와 본인 선택 상태가 새로 열어도 유지된다.
- 차트 마커는 서버 거래만 표시하고 타인 수량을 노출하지 않는다.
- `app.html`과 `ui-src`를 함께 고쳤고 `node scripts/ui-build.mjs verify`가 통과한다.
- `web`의 테스트와 빌드가 통과한다.
