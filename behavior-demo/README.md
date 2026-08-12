# 행동 데이터 수집 데모

**"종목 이름만 보고 매수하나, 정보를 열어보고 매수하나"** 를 측정하는 프로토타입.

카드를 넘기면서 매수/패스를 결정하게 하되, 판단에 필요한 숫자는 전부
상세화면의 **3개 정보 섹션 뒤에 숨겨둔다**. 각 섹션의 `상세보기` 를 눌렀는지가
그대로 수집되고, 같은 종목의 매수 결정과 짝지어 저장된다.

카드 내용은 이 프로젝트의 `kids_친밀도우선_최종50.csv` 상위 20종목을 그대로 씀.

## 화면 구조

```
[카드 덱]  브랜드명 · 종목코드 · 등급만 노출          ← 숫자 없음(의도적)
   │  ← 스와이프로 바로 결정하면  = "이름만 보고 매수"
   │  ↓ 탭
[상세화면]
   ├ 📈 차트      (접힘)  [상세보기] → 주가 곡선 + 수익률/변동성/낙폭/샤프
   ├ 🏢 기업정보  (접힘)  [상세보기] → PER/PBR/배당/친밀도 + 설명
   ├ 📰 관련뉴스  (접힘)  [상세보기] → 최근 이슈 3건 요약
   └ [패스] [관심(매수)]          = "정보 보고 매수"
```

카드 앞면에 지표를 두면 "이름만 보고 샀는지"를 구분할 수 없다.
그래서 앞면은 이름/등급까지만 보여주고, 나머지는 전부 섹션 뒤로 넘겼다.

## 1. Supabase 테이블 만들기

Supabase 대시보드 → SQL Editor → `supabase_schema.sql` 전체 붙여넣고 Run.

| 테이블 | 내용 |
|---|---|
| `behavior_events` | 원본 이벤트 (swipe/scroll/tap/dwell/card_view/detail_open/**section_open**/**section_close**/**decision**) |
| `session_summary` | 세션 단위 집계 — 스코어링은 이 테이블 기준 |

분석용 뷰 3개도 같이 생성됨:

| 뷰 | 답하는 질문 |
|---|---|
| `v_buy_basis` | 이 세션은 이름형인가 정보형인가 |
| `v_ticker_impulse` | 어떤 **종목**이 정보 없이 충동적으로 팔리는가 |
| `v_section_demand` | 세 정보 탭 중 뭐가 제일 많이 열리는가 |

기존에 옛 스키마로 만든 프로젝트에도 그대로 Run 하면 됨 (`add column if not exists` 로 보강).

## 2. 키 넣기

프로젝트 루트에 `.env.local` (`.env.local.example` 참고):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

키는 프로젝트마다 다르게 서명돼 있음 — URL만 바꾸면 `401 Invalid API key` 남.
URL과 anon key는 **항상 같이** 교체할 것.

키를 안 넣어도 앱은 돌아감 (전송만 건너뛰고 수집·집계는 화면에 그대로 보임).

## 3. 실행

```
npm install
npm run dev
```

- PC: http://localhost:5173
- 폰(같은 와이파이): 터미널에 찍히는 `Network:` 주소로 접속 → 실제 터치 제스처로 테스트
  - 이 주소는 공유기가 IP를 새로 줄 때마다 바뀜. `ipconfig getifaddr en0` 로 확인.

## 4. 조작

- 카드를 **좌우로 드래그** → 패스 / 관심 → **정보 0개로 결정 = 이름형**
- 카드를 **탭** → 상세화면, 섹션의 **상세보기**를 눌러야 숫자가 나옴
- 상세화면 하단 **패스 / 관심** 버튼 → **정보 N개 보고 결정 = 정보형**
- 화면 아무 데나 누르는 모든 터치 → 히트맵 좌표 + 눌린 섹션 수집
- **세션 종료** 버튼 → 그때까지 모은 걸 Supabase에 배치 전송

## 수집 구조

```
터치/제스처/섹션 열람
   ↓  (메모리 버퍼에만 쌓임 — 매 터치마다 네트워크 안 씀)
Tracker.events[]
   ↓  세션 종료 시 1회
   ├→ behavior_events   원본 이벤트 배열 insert
   └→ session_summary   Tracker.summarize() 결과 1행 insert
```

### 핵심 이벤트

| 이벤트 | 언제 | 핵심 필드 |
|---|---|---|
| `section_open` | 섹션 상세보기 클릭 | `section`, `meta.order` (이 종목에서 몇 번째로 열었나) |
| `section_close` | 섹션 접기 / 상세 이탈 | `duration_ms` (그 정보를 본 시간) |
| `decision` | 매수·패스 확정 | `choice`, `meta.sections_opened`, `meta.sections_list`, `meta.source` |

`decision` 하나만 봐도 판정이 되게 설계했다 — 결정 시점의 정보 노출 상태가
이벤트 안에 박혀 있어서, 나중에 조인 없이 `sections_opened = 0` 만 세면 된다.

### 좌표 정규화

모든 좌표는 화면 크기로 나눈 **0~1 값**으로 저장. 기기 해상도가 달라도 같은 기준으로 비교 가능.

### 히트맵

원본 좌표를 그대로 쌓지 않고 **4행 × 6열 그리드 밀도**로 압축 (`grid_density`, 합 1.0).

여기에 더해 `section_share` 는 탭이 어느 UI 덩어리에서 났는지를 저장하는데,
**y좌표 추정이 아니라 DOM 의 `data-section` 값을 그대로 읽는다.**
섹션이 접혔다 펼쳐지면 y 구간이 계속 바뀌기 때문에 좌표 기반 구간 분할은 못 쓴다.

### 파생 지표

| 지표 | 계산 |
|---|---|
| `name_only_buy_rate` | 섹션 0개 연 채로 한 매수 ÷ 전체 매수 ← **이 데모의 결론 숫자** |
| `avg_sections_before_buy` | 매수 전 평균 열람 섹션 수 (0~3) |
| `info_use_rate` | 전체 결정 중 정보를 한 번이라도 연 비율 |
| `first_section` / `top_section` | 제일 먼저 여는 / 제일 오래 보는 정보 |
| `decision_style` | 이름형(≥0.7) / 혼합형 / 정보형(≤0.3) — 매수 2건 이상일 때만 |
| `confidence_index` | 0.45 × 판단속도 + 0.3 × (1 − 상세진입률) + 0.25 × (1 − 정보열람률) |
| `exploration_index` | 0.35 × 읽기깊이 + 0.25 × 상세진입률 + 0.25 × 섹션열람 + 0.15 × (1 − 판단속도) |
| `behavior_type` | 즉단형 / 탐색형 / 신중형 / 산만형 — 결정 3건 이상일 때만 |

판단속도점수는 평균 스와이프 시간 300ms를 1.0, 2300ms를 0.0으로 두고 선형 환산.

**주의:** 이 가중치와 컷오프(0.7 / 0.3)는 임의로 정한 데모용 값. 실제로 쓰려면
실사용 데이터를 모아 분포를 보고 다시 잡아야 함.

## RN으로 옮길 때

수집 로직(`src/tracker.js`)은 브라우저 API를 `performance.now()`, `localStorage`,
`crypto.randomUUID()` 세 개만 씀. RN에서는 각각 `Date.now()`,
`AsyncStorage`, `uuid` 패키지로 바꾸면 그대로 재사용 가능.

이벤트를 만들어 넣는 쪽(`App.jsx`)만 RN 컴포넌트로 교체:

| 웹 | RN |
|---|---|
| `onPointerDown/Move/Up` | `react-native-gesture-handler` 의 `PanGestureHandler` |
| `onScroll` + `scrollHeight` 계산 | `ScrollView` 의 `onScroll` (`contentOffset` / `contentSize`) |
| 프레임 `onPointerDown` + `closest('[data-section]')` | 루트 `View` 의 `onTouchStart` + 섹션 `View` 별 `onTouchStart` |
| 아코디언 `상세보기` 토글 | 같은 구조 그대로 (`useState` + `trackSectionOpen/Close`) |

## F9 SPEC 대응표

기준 문서는 `web/features/f9-archive/SPEC.md` §4다. 두 구현은 **매수 전에 연 차트·기업정보·뉴스**를 원천 데이터로 함께 쓰지만, 현재 데모의 세션 유형을 F9 유형으로 그대로 복사할 수는 없다.

### 정확히 대응

| 데모 | F9 §4 | 대응 규칙 |
|---|---|---|
| 매수 `decision.meta.sections_opened` (0~3) | `axes.viewedTabs` (0~3) | `choice === 'buy'`인 결정만 사용한다. 같은 차트·기업정보·뉴스 3개 중 매수 전에 연 개수다. |
| `decision.meta.sections_list`의 `chart` / `company` / `news` | 차트 / 기업정보 / 뉴스 탭 | 코드와 한글 명칭만 변환하고 탭 집합은 그대로 사용한다. |

### 이름만 다름

| 데모 명칭 | F9 명칭 | 대응 규칙 |
|---|---|---|
| 이름형 | 직관형 | 개념상 대응한다. 이관할 때 기존 `decision_style`을 복사하지 말고 원본 매수별 `sections_opened <= 1`로 다시 판정한다. 데모의 이름형 원천 기준은 0개뿐이라 1개 열람 건은 재분류가 필요하다. |
| 정보형 | 근거형 | 개념상 대응한다. 원본 매수별 `sections_opened >= 2`로 다시 판정한다. 데모의 정보 열람 건은 1개부터 포함하므로 1개 열람 건은 제외해야 한다. |

따라서 이 두 행은 명칭의 개념 대응표일 뿐, 현재 데모의 0.7/0.3 세션 컷오프까지 같다는 뜻은 아니다.

### 한쪽에만 존재

| 소유 | 항목 | 설명 |
|---|---|---|
| 데모만 | `name_only_buy_rate`, `informed_buy_rate`, `info_use_rate` | 매수 또는 전체 결정에서 정보 사용 비율을 계산하는 세션 집계다. F9 축에는 비율 컷오프가 없다. |
| 데모만 | `avg_sections_before_buy`, `first_section`, `top_section`과 섹션별 열람 통계 | 평균·선호 순서·체류시간 집계다. F9의 `viewedTabs` 단일 값과 같은 출력 계약이 아니다. |
| 데모만 | `decision_style`의 혼합형과 0.7/0.3 컷오프 | F9 판단 근거 축은 직관형/근거형의 1/2개 컷오프만 사용한다. |
| 데모만 | `confidence_index`, `exploration_index` | 속도·상세 진입·스크롤 깊이·정보 열람을 가중 합산한 데모 지표다. |
| 데모만 | `behavior_type`의 즉단형·탐색형·신중형·산만형 | 확신도·탐색도 기준 4유형이다. F9 사분면과 축이 다르다. |
| F9만 | `axes.tradedCompanies`와 집중러/분산러 | 시즌 거래 기업 수 3/4개 컷오프다. 데모 요약에는 거래 기업 수 축이 없다. |
| F9만 | 직관형 집중러·직관형 분산러·근거형 집중러·근거형 분산러 | 판단 근거와 포트폴리오 폭을 조합한 F9 전용 4유형이다. |
| F9만 | `sampleSize`, `reasonDistribution`, `confidencePattern`, `observationState` | F9 엔진 출력 계약이며 데모 세션 요약에는 같은 필드가 없다. |
