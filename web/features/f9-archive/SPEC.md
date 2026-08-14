# F9 — 가족 아카이브 기능 명세

> **현재 구현 단일 원본** · 2026-08-14 · 기준 브랜치 `claude/김경렬/아카이브-시즌카드`
>
> 현행 동작은 **`web/public/ui/app.html` 렌더링 → `buildArchive()` → `shared/engine/archive-profile.js` → 이 문서** 순으로 확인한다. 제품 목표·법무·전역 레드라인은 `docs/영웅키움_기획_통합문서_v2.md`를 따른다.

## 1. 현재 범위

F9 사용자 화면은 `app.html` 안의 `archive` 화면이며 탭은 **두 개**다.

1. **성향**: 능력치 오각형, 투자 유형 카드, 축 상세 시트
2. **수익률**: 가족 달리기 트랙, 총자산·현금, 거래 피드

탭 밖에서 열리는 오버레이가 셋 있다.

| 오버레이 | 여는 곳 | 내용 |
|---|---|---|
| 카드 모아보기 | 성향 탭 | 주 단위 성향 카드. 기록이 있는 주(로컬 또는 Supabase, §3.5) + 이번 주 |
| 카드 상세 시트 | 카드 모아보기 | 그 주 카드 한 장 |
| 가족 투자 성향 비교 | 성향 탭 | 구성원 오각형 겹치기 |

가족 체결 마커는 F2 차트 안에 있고, 가족 거래 피드는 F11 React 오버레이다.

## 2. 소유권과 실행 경로

| 영역 | 실제 위치 | 책임 |
|---|---|---|
| 아카이브 화면 | `web/ui-src/screens/archive.html` | 마크업. `app.html` 은 여기서 조립된다 |
| 화면 조립 | `web/ui-src/methods/buildArchive.js` | 색·좌표·문구 등 표시값 생성 |
| **계산** | `web/shared/engine/archive-profile.js` | **능력치 다섯 축, 캐릭터·레벨, 정확 채점** |
| 레일 드래그 | `web/ui-src/methods/bindCardRail.js` | 카드 가로 스크롤 |
| 종가 조회 | `web/ui-src/methods/loadDailyCloses.js` | 사고판 종목 일봉을 한 번에 받아 온다 |
| 종가 API | `web/app/api/quote/daily-closes/route.ts` | 보관 일봉에서 `{종목: [{date, close}]}` |
| 빌드 | `web/scripts/ui-build.mjs` | `ui-src` ↔ `app.html` 왕복과 엔진 복사 |
| 원본 데이터 | `localStorage["kw_proto_v1"]` | `acc`·`records`·`sellRecords`·`events` |
| 행동 데이터 판정 API | `web/app/api/profile/behavior/route.ts` | 로그인 세션의 `stock_tab_views`·`transactions` 집계 → 캐릭터 키 |
| 행동 데이터 조회 | `web/ui-src/methods/loadBehaviorProfile.js` | 진입 시 위 API를 불러 `this.dbBehavior`에 저장 |
| 지난 주차 카드 API | `web/app/api/profile/season-cards/route.ts` | 로그인 세션의 `transactions`(매수만)를 KST 주 단위로 묶어 주차별 다섯 축 점수 반환. 이번 주는 제외 |
| 지난 주차 카드 조회 | `web/ui-src/methods/loadSeasonCards.js` | 진입 시 위 API를 불러 `this.dbSeasonCards`에 저장 |

`web/features/f9-archive/`에는 화면 컴포넌트가 없다. UI가 기능 폴더로 이관됐다고 가정하지 않는다.

## 3. 계산(구버전, 화면 현행) — `shared/engine/archive-profile.js`

`web/AGENTS.md`는 수치·스코어링 계산을 `shared/engine`에서만 하도록 정한다. 화면은 결과를 표시만 한다.

> **§3~§5 는 화면이 지금 쓰는 구버전이다.** 앞으로 갈 정본은 §6 신버전(`behavior-profile.ts`)이며, 화면 이관이 끝나면 이 절과 `archive-profile.js` 를 지운다.

### 3.1 능력치 다섯 축

축 순서는 오각형과 같다: **집중 · 분산 · 정확 · 직관 · 근거**. 범위는 0~100 정수다.

| 축 | 산식 |
|---|---|
| 근거 `evidence` | 매수 이유가 `buy_news`·`buy_chart`·`buy_familiar` 인 비율 × 100, 반올림 |
| 직관 `intuition` | `100 - 근거` |
| 집중 `focus` | `100 - (보유 섹터 수 - 1) × 22`, 0~100 로 자름. 섹터 수는 최소 1 |
| 분산 `diversification` | `100 - 집중` |
| 정확 `accuracy` | 채점된 거래의 적중률 × 100, 반올림 — 아래 §3.3 |

근거·직관과 집중·분산은 보완쌍이라 각 쌍의 합이 항상 100이다. 섹터를 알 수 없는 종목은 섹터 수에 넣지 않는다.

### 3.2 캐릭터와 레벨

| 캐릭터 | 코드 | 판정 |
|---|---|---|
| 저격수 | `sniper` | 근거 ≥ 직관, 집중 ≥ 분산 |
| 전략가 | `strategist` | 근거 ≥ 직관, 집중 < 분산 |
| 승부사 | `fighter` | 근거 < 직관, 집중 ≥ 분산 |
| 탐험가 | `explorer` | 근거 < 직관, 집중 < 분산 |

5:5 동점은 근거·집중 쪽으로 귀속한다. 레벨은 **적중 비율**로 정한다: **3 = 2/3 이상, 2 = 1/3 이상, 1 = 1/3 미만** (2026-08-13 유저 확정, 경계 포함은 [가정]). 화면에는 `저격수 LV2` 처럼 붙여 쓴다.

반올림한 퍼센트가 아니라 **반올림 전 비율**로 판정한다. 3건 중 2건(66.67%)이 반올림 때문에 레벨 2로 떨어지지 않게 하기 위해서다.

**근거·집중의 대체 입력 — 로그인 사용자 행동 데이터.** 로컬스토리지 계산과 별개로, 실제 로그인 세션(Supabase)의 다음 두 신호가 있으면 그 값으로 근거·집중 우세만 다시 정하고 위 표에 그대로 대입한다. 정확·레벨과 다섯 축 막대 수치는 이 경로의 영향을 받지 않는다 — **캐릭터 카드(이름·이미지·설명)만 바뀐다.**

| 축 | 산식 | 데이터 |
|---|---|---|
| 근거/직관 우세 | `stock_tab_views.tab_count` 합계 — 0~1 → 직관 우세, 2 이상 → 근거 우세 | 로그인 사용자의 `stock_tab_views` 전 행 |
| 집중/분산 우세 | 거래한 종목 수(매수·매도 통틀어 distinct `stock_id`) — 2개 이하 → 집중 우세, 3개 이상 → 분산 우세 | 로그인 사용자의 `transactions` 전 행 |

- 판정 함수: `web/shared/engine/archive-profile.js`의 `resolveCharacterFromBehaviorSignals(tabCountTotal, distinctSymbolCount)`.
- 조회·집계: `web/app/api/profile/behavior/route.ts` (GET, 로그인 세션 필요, 기간 제한 없이 전체 누적 집계). **주 단위 등 데이터 리셋은 운영이 `stock_tab_views`·`transactions` 원본을 직접 관리하는 별도 절차이며 이 API·엔진은 리셋을 수행하지 않는다.**
- 화면 연결: `componentDidMount`가 진입 시 이 API를 한 번 불러 `this.dbBehavior`에 저장한다. `buildArchive()`는 `dbBehavior.character`가 있으면 그 캐릭터로 표시하고, 없으면(비로그인·표본 없음 등) 기존 로컬스토리지 계산으로 폴백한다.

### 3.3 정확 채점

정확은 사고판 시점이 맞았는지를 본다. 채점은 **체결 다음 거래일부터 세어 5거래일 뒤 종가** 기준이다.

| 거래 | 적중 조건 |
|---|---|
| 매수 | 5거래일 뒤 종가 > 체결가 (체결가 = 주문금액 ÷ 주 수) |
| 매도 | 5거래일 뒤 종가 < 매도일 종가 |

- 매도 체결가는 화면이 저장하지 않아 **매도 당일 종가(없으면 직전 거래일 종가)로 근사**한다 **[가정]**.
- 5거래일이 안 지났거나 종가가 없으면 `pending` 으로 빼고 적중률에서 제외한다.
- 채점된 거래가 하나도 없으면 기본 비율 `0.5`(= 정확 50, 레벨 2)로 시작한다 **[가정]**.
- 지정가 대기(`order_status !== "filled"`) 주문은 체결이 아니라 채점하지 않는다.

`FOCUS_STEP_PER_SECTOR = 22` 는 확정 산식이 아닌 **[가정]** 상수다.

### 3.4 종가는 어디서 오나

```text
아카이브 진입
  → loadDailyCloses()  사고판 종목 코드를 모아 한 번만 요청
  → GET /api/quote/daily-closes?symbols=...
  → 보관 일봉(Supabase)에서 { 종목: [{date, close}] }
  → state.closes → buildArchive → gradeAccuracy
```

- 종목마다 따로 부르지 않는다. 거래 종목이 바뀌지 않으면 다시 부르지 않는다.
- 이 엔드포인트는 **보관 캔들만 읽고 키움을 부르지 않는다.**
- 요청이 실패하면 `closes` 가 비어 전부 `pending` 이 되고, 화면은 기본값으로 그대로 뜬다.
- 종가 적재는 장마감 배치와 `web/scripts/seed-candles.ts` 가 담당한다. 배치가 밀리면 최근 거래가 오래 `pending` 에 남는다.

### 3.5 지난 주차 카드의 Supabase 대체 입력

로컬스토리지가 초기화되면 지난 주 기록도 함께 사라진다. 카드 모아보기가 로그인 기간 동안의
지난 주를 계속 보여 줄 수 있도록, 로컬에 없는 지난 주는 Supabase `transactions` 로 다시 낸다.

- 조회·계산: `web/app/api/profile/season-cards/route.ts` (GET, 로그인 세션 필요). 그 사용자의
  `transactions`에서 `side = 'buy'` 행만 모아 `weekStartKstOf`(KST 월요일 날짜)로 주 단위로
  묶고, 주마다 `computeAbilityScores`(§3.1과 같은 함수)로 다섯 축을 낸다. **이번 주는 이 API가
  다루지 않는다** — 화면은 이번 주에 항상 로컬 계산 + §3.2 행동 데이터 오버라이드를 쓴다.
- 섹터는 `stocks.category`를 그대로 쓴다. 정확은 과거 주차 공통 관례(§3.3 서두, §7)대로 채점하지
  않고 `ACCURACY_PLACEHOLDER`(50) 그대로 둔다 — 로컬 지난 주 카드와 동일하다.
- 주 경계 함수: `web/shared/engine/archive-profile.js`의 `weekStartKstOf(iso)`. 화면의 로컬 주
  경계(`monday()`, 브라우저 로컬 시간)와 다른 함수지만 KST 단일 시장을 가정해 같은 월요일로
  맞아떨어진다.
- 화면 연결: `componentDidMount`가 진입 시 `loadSeasonCards()`로 이 API를 한 번 불러
  `this.dbSeasonCards`에 저장한다. `buildArchive()`는 로컬 주 그룹(`weeks`)에 없는 지난 주만
  이 응답으로 채우고, 이번 주와 로컬에 이미 기록이 있는 주는 그대로 로컬 계산을 쓴다.
- **`stock_tab_views`는 이 계산에 들어가지 않는다.** 지난 주차 카드는 로컬 지난 주 카드와 같은
  산식(매수 이유 비율·섹터 수)만 쓴다. 다만 `stock_tab_views`·`transactions`에 지난 주 더미
  행을 넣으면 §3.2의 "로그인 사용자 행동 데이터" 오버라이드는 **기간 제한 없이 전체 누적**이라
  이번 주 카드의 캐릭터 표시에도 함께 영향을 줄 수 있다 — 별개 경로이지만 같은 원본 테이블을
  공유하기 때문이다.

## 4. 엔진 복사본과 드리프트 검출

`app.html`은 정적 파일이라 TypeScript 모듈을 import 할 수 없다. 그래서 엔진 원본을 **복사본으로 넣는다.**

```text
shared/engine/archive-profile.js   ← 원본. 테스트도 이 파일을 본다
   │  ui-build.mjs 가 export 를 떼고 CRLF 로 바꿔
   ↓
app.html 안 `// >>> archive-engine` ~ `// <<< archive-engine`
```

- 조립할 때마다 원본에서 **다시 만들어 넣는다.** 복사본을 직접 고치면 다음 build 에서 사라진다.
- 원본만 고치고 `build` 를 안 돌리면 `node scripts/ui-build.mjs verify` 가 바이트 차이로 잡아낸다.
- 계산을 바꾸는 순서: 원본 수정 → 테스트 → `build` → `verify` → 화면 확인.

## 5. `buildArchive()` 산출 계약

```ts
{
  weekLabel: string;                  // "8월 2주차"
  traits: Trait[];                    // 다섯 축 라벨·점수·좌표·선택 핸들러
  radarPoly: string;                  // 오각형 폴리곤 좌표
  type: { key; name; desc; img; pal; lv; title };
  weekCards: WeekCard[];              // 주별 카드
  famPolys: FamPoly[];                // 가족 비교 오각형
  runners: Runner[];                  // 수익률 달리기
  retHeroLabel · retHeroPctText · retHeroPctStyle · retHeroTotalText · retCashText;
  retSectors · retFeed · retFeedLabel;
  secModal · secModalEmoji · secModalIconStyle · secModalName
    · secModalCount · secModalValue · secModalPctText · secModalPctStyle · secModalRows;
}
```

`renderVals()` 는 `const arc = this.buildArchive()` 로 받아 화면 키에 펼친다.

## 6. 신버전 엔진 — `shared/engine/behavior-profile.ts` (화면 이관 전)

위 §3~§5 는 **화면이 지금 쓰는 구버전**(`archive-profile.js`)이다. 이 절은 **화면이 앞으로 쓸 신버전**이다. 두 벌이 동시에 존재하는 건 이관 중이기 때문이며, 화면 이관이 끝나면 `archive-profile.js` 를 지운다.

### 6.1 설계 원칙 — 5가 중립

모든 축이 **0~10 이고 5가 중립**이다. 표본이 없으면 5에서 시작해 기록이 쌓일수록 5에서 멀어진다. 극단값은 증거가 있을 때만 나온다.

구버전에서 이 원칙이 깨져 있던 곳:

| 구버전 | 신버전 |
|---|---|
| 매수 0건 → 근거 0(직관 100) | 매수 0건 → 근거 5 |
| 전량 매도 → 집중 1 | 전량 매도 → 집중 5 |
| 채점 1건 적중 → 정확 100 | 채점 1건 적중 → 정확 6 |
| 5:5 동점 → 저격수로 강제 귀속 | 동점대(차이 < 1) → `character: null` |

### 6.2 다섯 축

| 축 | 산식 |
|---|---|
| 근거력 `evidence` | 3탭 중 **2개 이상을 매수 직전 10초 넘게 본** 매수의 비율에 표본 축소 적용 |
| 직관력 `intuition` | `10 − 근거력` |
| 집중력 `focus` | 아래 §6.3 |
| 분산력 `diversification` | `10 − 집중력` |
| 정확력 `accuracy` | 채점된 거래의 적중 비율에 표본 축소 적용 — 아래 §6.4 |

**표본 축소(shrinkage)** — `shrink(적중, 전체) = 10 × (적중 + k/2) / (전체 + k)`, `k = SHRINKAGE_K = 4`.
표본 0건이면 정확히 5, 1건 성공이면 6, 1건 실패면 4다. 한두 건으로 극단이 나오지 않는다.

점수는 **소수점 한 자리**로 반올림한다. 화면 표시는 정수로 더 줄여도 된다.

### 6.3 집중력 — 유효 섹터수 + 현금 감쇠

가짓수가 아니라 **비중까지 반영한 실질 분산 정도**를 본다.

```
wᵢ  = 섹터 i 평가액 ÷ 전체 주식 평가액
ES  = 1 / Σwᵢ²                                  (유효 섹터수)
raw = clamp(10 − FOCUS_SPAN × log_FOCUS_ANCHOR_ES(ES), 0, 10)
invested = 주식 평가액 ÷ (현금 + 주식 평가액)
집중력   = 5 + (raw − 5) × invested
```

`FOCUS_ANCHOR_ES = 3`, `FOCUS_SPAN = 5` **[가정]**.

| ES | 1 | 1.5 | 2 | 3 | 4 | 6 | 9+ |
|---|---|---|---|---|---|---|---|
| raw | 10 | 8.2 | 6.8 | **5** | 3.7 | 1.8 | 0 |

- 반도체 900만 + 게임 1만은 섹터가 둘이어도 ES ≈ 1.0 이라 집중이다.
- 계단이 없다. 종목 한 주만 사도 점수가 연속으로 움직인다.
- 현금이 많을수록 중립으로 끌려온다. **전량 현금이면 정확히 5**다 — 판단할 근거가 없다는 뜻이다.
- 섹터를 모르는 종목은 ES 에서 빼되 `invested` 에는 넣는다. 투자한 돈은 투자한 돈이다.

### 6.4 정확력 — 체결 **2거래일** 뒤 종가

2026-08-14 유저 확정. 월요일에 사면 수요일 종가로 판정한다 (`ACCURACY_WAIT_TRADING_DAYS = 2`).

| 거래 | 적중 조건 |
|---|---|
| 매수 | 2거래일 뒤 종가 > 체결가 |
| 매도 | 2거래일 뒤 종가 < 매도 체결가 |

- 매도 체결가는 `sell.price` → 매도일 종가(없으면 직전 거래일) 순으로 잡는다 **[가정]**.
- 2거래일이 안 지났거나 종가가 없으면 보류하고 적중률에서 뺀다.
- 레벨 경계는 기존 비율 1/3·2/3 을 0~10 으로 옮긴 값이다: `LV3 ≥ 20/3`, `LV2 ≥ 10/3`, 나머지 LV1.
- 채점 함수는 `settledOn`(채점이 끝난 KST 날짜)을 함께 낸다. §6.6 주간 귀속이 이 값을 쓴다.

### 6.5 캐릭터

| 캐릭터 | 코드 | 판정 |
|---|---|---|
| 저격수 | `sniper` | 근거 > 직관, 집중 > 분산 |
| 전략가 | `strategist` | 근거 > 직관, 집중 < 분산 |
| 승부사 | `challenger` | 근거 < 직관, 집중 > 분산 |
| 탐험가 | `explorer` | 근거 < 직관, 집중 < 분산 |

- **어느 한 쌍이라도 차이가 `TIE_BAND = 1` 미만이면 `null`** 이다. 우세를 꾸며내지 않는다.
- 체결 매수가 `MIN_BUYS_FOR_PROFILE = 3` 건 미만이면 캐릭터·레벨을 주지 않는다 (`observation: "none" | "low"`).
- 화면 엔진의 `fighter` 와 코드가 다르다 — 이관할 때 `challenger` 로 맞춘다.

### 6.6 주간 결산 카드 + 누적 현재 카드

**축마다 시간 성격이 달라 귀속 규칙을 따로 둔다.**

| 축 | 성격 | 주간 카드 | 누적 카드 |
|---|---|---|---|
| 근거력 | 유량 | 그 주에 체결된 매수만 | 전체 매수 |
| 정확력 | 유량 + 2거래일 지연 | **그 주에 채점이 끝난 거래**(`settledOn` 기준) | 전체 채점 |
| 집중력 | 저량 | **그 주 마지막 날 보유 스냅샷** | 오늘 보유 |

정확력을 체결 주가 아니라 **채점 주**에 귀속하는 게 핵심이다. 그래야 끝난 주 카드가 나중에 바뀌지 않는다 — 결산의 조건이다.

- 주 경계는 **월요일 00:00 ~ 일요일 24:00 KST** (`weekBucketsKST`). 라벨은 `8/10 – 8/16`.
- 첫 거래가 있는 주부터 오늘이 속한 주까지 만든다. 거래가 하나도 없어도 이번 주 한 장은 나온다.
- 과거 보유는 `replayPortfolio` 가 **현재 보유·현금에서 그 이후 거래를 최신순으로 되돌려** 복원한다.
- 주간 `pending` 은 반대로 **그 주에 한 거래 중 아직 판정 안 난 것**을 센다.
- 계산 함수(`computeAbilities`)는 기간을 모른다. 기간 자르기는 바깥에서 표본을 잘라 넘기므로 주간·누적이 같은 함수를 쓴다.

### 6.7 출력 계약

```ts
BehaviorProfileSnapshot = {
  userId; periodStart; periodEnd;
  cumulative: AbilityCard;      // 현재 카드 = 전체 누적
  weeks: WeekCard[];            // 주간 결산, 오래된 주 → 이번 주
  reasonDistribution; actionAlignment;
}
AbilityCard = { scores; character; level; samples; observation }
WeekCard    = AbilityCard & { weekStart; weekEnd; label; status: "closed" | "current" }
```

`POST /api/profile` 이 이 스냅샷과 Luna 서술을 함께 낸다. 오늘 날짜는 `deps.now()` 로 주입받는다 — 주간 카드가 오늘에 매달리므로 테스트가 고정할 수 있어야 한다.

### 6.8 두 입력 경로 — 같은 엔진

주차 카드를 내는 곳이 둘인데 **산식은 한 벌**이다. 입력 저장소만 다르다.

| | `POST /api/profile` | `GET /api/profile/season-cards` |
|---|---|---|
| 입력 | 화면이 보낸 `kw_proto_v1` + F11 시드 | 로그인 세션의 Supabase 기록 |
| 세션 | 불필요 (body 로 받음) | `kw_uid` 쿠키 필요 |
| 근거력 입력 | `events` 의 탭 열람(종류·체류 그대로) | `stock_tab_views` 복원 (§6.9) |
| 계획 일치 | `sellRecords.plan_match` | DB 에 없어 `actionAlignment` 는 항상 0 |
| 현재가 | 유니버스 시세 | 보관 종가의 마지막 값 |

`season-cards` 응답의 `weeks[]` 는 화면이 아직 읽는 `weekStart`·`count`·`scores`(**0~100**, 집중·분산·정확·직관·근거 순)를 유지하고, 신버전 값 전체를 `card` 에 함께 넣는다. 화면 이관이 끝나면 호환 필드를 지운다.

### 6.9 `stock_tab_views` → 근거력 복원 [가정]

화면은 `flushTabViews` 를 **매수할 때만** 부른다. 그래서 `stock_tab_views` 한 행은 **"이 매수 직전에 10초 넘게 본 방문 N번"** 을 뜻한다. 행에는 어느 탭인지·언제 봤는지가 없으므로 그 뜻을 엔진 입력 형태로 되살린다.

- 행을 시간순으로 매수에 짝지운다. 체결과 flush 가 거의 동시라 `TAB_FLUSH_TOLERANCE_MS = 60_000` 만큼 여유를 둔다.
- `tab_count` 만큼(최대 3) 서로 다른 탭을 매수 직전 시각으로 만든다. 엔진은 **종류 수**만 보므로 라벨은 결과를 바꾸지 않는다.
- 체류는 서버가 이미 10초 이상을 검산해 저장한 값이라 기준값을 그대로 넣는다.

**한계:** 같은 탭을 세 번 본 것과 세 탭을 한 번씩 본 것을 구분하지 못한다. 구분하려면 `stock_tab_views` 에 탭 종류 컬럼이 필요하다.

### 6.10 아직 연결 안 된 것

- **화면이 신버전 계약을 직접 읽지 않는다.** `app.html` 은 여전히 §3 구버전으로 이번 주를 계산하고, 지난 주만 `season-cards` 의 0~100 호환 배열을 쓴다.
- **`info_detail_opened` 가 화면에서 한 번도 안 찍힌다.** `logEvent` 호출부는 `news_detail_opened`·`chart_detail_opened` 둘뿐이라 로컬 경로의 "3탭 중 2탭" 규칙이 실질 "2탭 중 2탭"이다.
- `archive-profile.js` 의 `weekStartKstOf` 는 `season-cards` 가 신버전으로 옮겨가며 쓰이지 않게 됐다. 구버전을 지울 때 함께 정리한다.
- `shared/store/family-trade-seed.ts` 주석이 아직 "5거래일" 기준으로 적혀 있다 (다른 세션 소유 경로).

## 7. 현재 알려진 불일치·미완료

- **지난 주 카드의 정확은 로컬 기록만 있을 때 여전히 기본값이다.** `season-cards`(Supabase 경로)는 §6 신버전으로 실제 채점하지만, 화면이 로컬 `records` 만으로 그리는 주는 구버전 `computeAbilityScores` 를 채점 없이 부른다. 화면 이관 때 함께 없어진다.
- 종가 배치가 밀리면 최근 거래가 오래 `pending` 에 남아 정확이 기본값 50에 머문다.
- 수익률 탭에서 `보유 종목 · 섹터별` 레일을 뺐다. 그 레일에서만 열리던 **섹터 상세 모달(`secModal*`)과 `retSectors` 계산이 화면에서 도달 불가**로 남아 있다. 되살리거나 지우는 판단이 필요하다.
- 가족 비교의 아빠(`dad`)는 앱 계정이 없어 값이 비어 있다.
- 시즌 기록 탭은 없다. 주별 누적은 카드 모아보기가 대신하고, 로컬에 없는 지난 주는 §3.5 가 Supabase `transactions` 로 채운다. "시즌" 이라는 이름의 화면·데이터 개념은 여전히 없다 — 카드에는 "이번 주"·"○월 ○주차" 라벨만 있다.
- §3.5 의 지난 주차 카드와 §3.2 의 이번 주 행동 데이터 오버라이드는 같은 `transactions`·`stock_tab_views` 테이블을 다른 기간으로 읽는다. 한쪽에 더미·과거 행을 넣으면 다른 쪽 표시도 바뀔 수 있다는 점을 잊지 않는다.
- 부모 단독 화면으로 전환하는 전역 계정 스위처가 메인 앱에 없다.
- 매수 기록이 없어도 캐릭터가 나온다. 관찰 초기 상태를 따로 두지 않는다.

## 8. 금지 사항

- 캐릭터를 우열·성적·등수로 표현하지 않는다.
- 능력치를 실력 등급으로 표현하지 않는다.
- 수익률에 예측이나 해석을 붙이지 않는다.
- 계산을 화면(`buildArchive`·`renderVals`)에 두지 않는다. `shared/engine` 에만 둔다.
- `app.html` 이나 엔진 복사본을 직접 고치지 않는다. `ui-src` 와 엔진 원본을 고치고 `build` 한다.

## 9. 완료 기준

- 성향·수익률 두 탭과 오버레이 셋이 실제 `app.html` 데이터 흐름과 일치한다.
- 엔진 산식별 경계 테스트가 통과한다 (`shared/engine/archive-profile.test.ts`).
- `node scripts/ui-build.mjs verify` 가 바이트 동일로 통과한다.
- `web` 의 `npm test` 와 `npm run build` 가 통과한다.
