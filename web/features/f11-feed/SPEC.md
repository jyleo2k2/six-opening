# F11 — 가족 거래 피드 기능 명세

> **기능 단일 원본** · 2026-08-15 · 기준: 아카이브 화면 React 이관 이후
>
> 이 문서는 희망 설계가 아니라 현재 사용자가 실제로 만나는 동작을 기록한다. 충돌 시 프론트 구현 → 백엔드 계약 → 이 문서 순으로 확인한다.

## 1. 현재 사용자 경험

- 가족 기록은 별도 라우트가 아니다. `ArchiveScreen` 의 **수익률 탭**(`/archive/return`)이 피드를 소유한다.
- `GET /api/family?offset=`가 로그인 세션과 같은 `family_tag`의 구성원과 Supabase 체결을 최신순 50건씩 제공한다. 처음 50건 뒤에는 아래 끝까지 내릴 때만 다음 50건을 붙인다.
- `전체`와 실제 구성원 이름 필터로 자녀·부모 각각의 거래를 볼 수 있다. 필터는 로그인 사용자를 바꾸지 않는다.
- 자신의 카드에는 수량과 주당 체결가를 표시하고, 다른 가족 카드에는 서버 응답 단계부터 둘 다 `null`로 숨긴다.
- 코멘트는 Supabase에 저장하며 부모→자녀 방향의 추천·타이밍·훈계·채점 표현을 서버에서 차단한다.
- 코멘트 작성자는 실제 `profiles.name`으로 표시해 엄마·아빠를 구분하고, 본인이 쓴 코멘트만 삭제할 수 있다.
- 좋아요는 가족 전체 개수와 로그인 사용자의 선택 상태를 DB에 저장하며 다시 누르면 취소한다.

## 2. 소유권

| 위치 | 현재 책임 |
|---|---|
| `web/features/f0-home/ArchiveScreen.tsx` 수익률 탭 | 피드 카드, 구성원 필터, 코멘트·좋아요 입력 |
| `web/features/f0-home/lib/archive-feed.ts` | 카드 값 계산 — 마스킹된 체결가를 화면에서 되살리지 않는다 |
| `web/features/f0-home/lib/use-archive-data.ts` | `/api/family` 50건 페이지 조회·누적, 페이지별 거래 id 반응 조회, 좋아요 토글·코멘트 작성·본인 삭제 |
| `web/app/api/family/route.ts` | 가족 범위, 구성원 성향, 구성원별 수익률, **가족 자산 합계(`total`)**, 체결 50건 페이지와 타인 수량·체결가 마스킹 |
| `web/shared/engine/comment-filter.ts` | 서버 저장 전 코멘트 문구 게이트 |
| `web/shared/engine/trade-markers.ts` | 차트 마커 데이터 변환 |
| `web/app/api/trades/route.ts` | 세션 가족의 종목별 체결 조회와 타인 수량 마스킹 |
| `web/app/api/comments/route.ts` | 서버 코멘트 조회·작성·삭제 계약 |
| `web/app/api/likes/route.ts` | 서버 좋아요 조회·토글 계약 |

F11에는 자체 화면이 없다(오버레이 `FeedScreen`은 소비자가 없어 삭제됐다). 피드는 `ArchiveScreen` 수익률 탭 **한 곳**이 그리고, 이 폴더에는 SPEC과 가드만 남는다.

## 3. 프론트 데이터 흐름

### 3.1 가족 거래

`useArchiveData()` 가 아카이브 진입 시 `/api/family?offset=0`으로 첫 50건을 호출하고, 응답의 체결 id로 댓글·좋아요를 이어서 조회한다. 사용자가 수익률 탭을 아래로 내려 끝에서 240px 안에 들어오면 `page.nextOffset`으로 다음 50건을 한 번만 요청해 기존 목록 뒤에 붙인다. 서버는 클라이언트가 넘긴 가족값을 받지 않고 세션 사용자의 `family_tag`로 범위를 정한다. 태그가 없으면 본인만 반환한다.

응답의 `page`는 `{ offset, limit: 50, hasMore, nextOffset }`이다. 서버는 내부에서 51건을 읽어 다음 페이지 존재 여부만 확인하고 화면에는 50건만 보낸다. `offset`은 0 이상의 정수만 허용한다.

| Supabase / 서버 응답 | `FamilyTrade` 변환 |
|---|---|
| `transactions.side` | `side: "buy"` / `"sell"` |
| `transactions.user_id` + `profiles` | `userId`·`memberName`·`memberRole` |
| `stocks` 관계 | `symbol`·`stockName` |
| 본인 `trade_quantity`·`trade_price` | `quantity`·`price` |
| 타인 `trade_quantity`·`trade_price` | 서버에서 `null` |

### 3.2 가족 반응

가족 거래 한 페이지를 받을 때마다 그 페이지의 최대 50개 거래 id만 `/api/comments`와 `/api/likes`로 보내 반응을 읽고 기존 반응 뒤에 합친다. 코멘트 작성·삭제와 좋아요 토글이 성공하면 해당 카드 상태만 서버 응답으로 갱신한다. 거래는 계속 표시하고 반응 API만 실패하면 별도 오류를 보여 준다.

### 3.3 카드 표시

| 항목 | 현재 동작 |
|---|---|
| 정렬 | 받아서 누적한 페이지 전체를 `tradedAt` 내림차순. 화면에서 다시 12건으로 자르지 않음 |
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
- `mine`인 코멘트만 수정·삭제 버튼을 표시하며 서버가 작성자를 다시 검사한다.
- 수정은 `PATCH /api/comments { id, body }`이며 **작성 때와 같은 게이트를 다시 건다.** 통과한 문장으로 저장한 뒤 고치는 길만 열려 있으면, 무해한 문장으로 올려 두고 수정으로 바꿔 넣을 수 있다. 원래 거래에 아직 접근할 수 있는지(`authorizeFeedTarget`)도 다시 본다 — 가족에서 빠진 뒤 남은 코멘트는 못 고친다.
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
| 모양 | 자녀/엄마/아빠 색의 B·S SVG 배지 + 체결 지점에서 시간축까지 점선 |
| 상호작용 | 표시 전용, 클릭 없음 |

응답 형식은 `{ trades: ChartTrade[] }`이다. 현재 저장소의 `transactions`에 체결이 없으면 마커가 없는 것이 정상이다.

### 5.1 핀 색을 정하는 `role`

응답의 각 줄은 `member`(`parent`·`child`)와 별개로 **`role`**(`child`·`mom`·`dad`)을 싣는다. `profiles.parent_child`가 `child`면 `child`, 아니면 `profiles.guardian_role`을 그대로 쓰고 그 값이 비면 `mom`으로 접는다.

`member`만으로는 엄마와 아빠가 같은 색이 되어 **누구의 매매인지 차트에서 못 가른다.** `member`는 부모·자녀 이분법이 필요한 곳(성향 비교 등)이 계속 쓰므로 지우지 않고 `role`을 더했다.

색은 자녀 `#A8B8E8`, 엄마 `#F2AECB`, 아빠 `#A9D5C8`이며 차트 마커(`app/globals.css`의 `--color-trade-*`)와 상세 미니 차트 핀(`f0-home/lib/detail-chart.ts`의 `PIN_COLORS`)이 같은 값을 쓴다. 같은 체결이 화면마다 다른 색이면 범례가 거짓말을 한다.

`role` 리터럴 타입은 지금 소비자마다 따로 적혀 있다(`f2-trade/TradingViewChart.tsx`, `f0-home/lib/chart-trade-legend.ts`, `f0-home/lib/detail-chart.ts`). `shared/types/trade.ts`는 오케스트레이터 소유라 이번 작업에서 건드리지 않았다 — **셋을 `shared`의 한 타입으로 올리는 것은 오케스트레이터에게 넘긴다.**

## 6. 백엔드 구현과 프론트 연결 상태

| 기능 | 서버 | 현재 F11 프론트 |
|---|---|---|
| 가족 전체 체결·구성원·성향 조회 | `/api/family` 구현 | 아카이브 수익률 탭에서 사용 |
| 종목별 가족 체결 조회 | `/api/trades` 구현 | TradingView 차트에서 사용 |
| 코멘트 배치 조회·작성·본인 수정·본인 삭제 | `/api/comments` 구현 | 아카이브 수익률 탭에서 사용 |
| 좋아요 배치 조회·토글 | `/api/likes` 구현 | 아카이브 수익률 탭에서 사용 |
| 가족 범위 검사 | 가족·거래·반응 API에서 구현 | 세션 `family_tag` 기준 응답만 사용 |
| 로그인·로그아웃 | `/api/auth/login` POST·DELETE 구현 | `LoginGate`·`HomeScreen` 메뉴가 호출. 계정 전환은 이 둘로만 한다 |
| 계정 전환 API | 없음 | 전용 스위처를 만들지 않기로 확정돼 `/api/auth/switch` 는 PR #221 에서 삭제했다. 전환은 로그아웃 후 재로그인이다 (`docs/기능명세.md` §4.2) |

거래·구성원·코멘트·좋아요는 모두 DB가 원본이다.

## 7. 확인된 불일치와 제약

1. 구성원 필터는 메인 앱 계정이나 `kw_uid`를 바꾸지 않는다. 계정 전환이 아니라 열람 필터다.
2. **본인 카드의 원 표시는 총 거래금액이 아니라 주당 체결가인데 라벨이 그 구분을 하지 않는다.** 매수·매도 양쪽 모두 해당한다. 남의 카드는 서버가 가격을 `null`로 마스킹해 `비공개`로 나오므로 본인 카드에서만 보인다. 라벨을 주당 단가로 명시하거나 `price × quantity`를 찍으면 해소된다.
3. 좋아요를 누른 사람 목록은 제공하지 않는다. 코멘트 수정 이력도 남기지 않는다 — 고친 뒤에는 마지막 문장만 있다.
4. **가족 자산 합계(`total`)는 마스킹 규칙의 예외다 (2026-08-16 유저 확정).** `/api/family`는 구성원 줄에 여전히 평가금액·원금·현금을 싣지 않지만, 같은 `family_tag` 전체를 더한 `{ assets, cost, profit, returnRate, memberCount }`를 내려준다. **구성원이 둘뿐이면 합계에서 자기 것을 빼 상대 자산을 그대로 알 수 있다** — 셋 이상에서만 개별 값이 가려진다. 가리려면 `memberCount < 3`일 때 합계를 빼는 판단이 필요하다.

## 8. 현재 완료 기준

- 아카이브 화면의 수익률 탭에서 가족 피드가 보인다.
- 같은 `family_tag`의 자녀·부모 구성원과 DB 체결이 첫 50건 보이고, 아래로 더 내릴 때마다 다음 50건이 이어진다.
- 실제 구성원 이름 필터로 각자의 거래를 따로 볼 수 있다.
- 로그인 사용자의 카드에만 수량·단가가 보이고 타인은 API 응답부터 `null`이다.
- 부모→자녀의 금지 코멘트는 저장되지 않고 안내가 보인다.
- 코멘트 작성자의 실제 이름이 보이고 본인 코멘트만 삭제할 수 있다.
- 좋아요 개수와 본인 선택 상태가 새로 열어도 유지된다.
- 차트 마커는 서버 거래만 표시하고 타인 수량을 노출하지 않는다.
- 피드 값 계산이 `lib/archive-feed.ts` 에 있고 그 테스트가 통과한다.
- `web`의 테스트와 빌드가 통과한다.
