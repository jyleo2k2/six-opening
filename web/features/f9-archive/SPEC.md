# F9 — 가족 아카이브 기능 명세

> **현재 구현 단일 원본** · 2026-08-14 · 기준 브랜치 `claude/이재용/아카이브랭킹-설빈판`
>
> 현행 동작은 **`web/public/ui/app.html` 렌더링 → `buildArchive()` → `shared/engine/archive-profile.js` → 이 문서** 순으로 확인한다. 제품 목표·법무·전역 레드라인은 `docs/영웅키움_기획_통합문서_v2.md`를 따른다.

## 1. 현재 범위

F9 사용자 화면은 `app.html` 안의 `archive` 화면이며 탭은 **두 개**다.

1. **성향**: 능력치 오각형, 투자 유형 카드, 축 상세 시트
2. **수익률**: 가족 달리기 트랙, 총자산·현금, 거래 피드

탭 밖에서 열리는 오버레이가 셋 있다.

| 오버레이 | 여는 곳 | 내용 |
|---|---|---|
| 카드 모아보기 | 성향 탭 | 주 단위 성향 카드. 기록이 있는 주 + 이번 주 |
| 카드 상세 시트 | 카드 모아보기 | 그 주 카드 한 장 |
| 가족 투자 성향 비교 | 성향 탭 | 구성원 오각형 겹치기 |

가족 체결 마커는 F2 차트 안에 있고, 가족 거래 피드는 F11 React 오버레이다.

## 2. 소유권과 실행 경로

| 영역 | 실제 위치 | 책임 |
|---|---|---|
| 아카이브 화면 | `web/ui-src/screens/archive.html` | 마크업. `app.html` 은 여기서 조립된다 |
| 화면 조립 | `web/ui-src/methods/buildArchive.js` | 색·좌표·문구 등 표시값 생성 |
| **계산** | `web/shared/engine/archive-profile.js` | **능력치 다섯 축과 캐릭터·레벨** |
| 레일 드래그 | `web/ui-src/methods/bindCardRail.js` | 카드 가로 스크롤 |
| 빌드 | `web/scripts/ui-build.mjs` | `ui-src` ↔ `app.html` 왕복과 엔진 복사 |
| 원본 데이터 | `localStorage["kw_proto_v1"]` | `acc`·`records`·`sellRecords`·`events` |

`web/features/f9-archive/`에는 화면 컴포넌트가 없다. UI가 기능 폴더로 이관됐다고 가정하지 않는다.

## 3. 계산 — `shared/engine/archive-profile.js`

`web/AGENTS.md`는 수치·스코어링 계산을 `shared/engine`에서만 하도록 정한다. 화면은 결과를 표시만 한다.

### 3.1 능력치 다섯 축

축 순서는 오각형과 같다: **집중 · 분산 · 정확 · 직관 · 근거**. 범위는 0~100 정수다.

| 축 | 산식 |
|---|---|
| 근거 `evidence` | 매수 이유가 `buy_news`·`buy_chart`·`buy_familiar` 인 비율 × 100, 반올림 |
| 직관 `intuition` | `100 - 근거` |
| 집중 `focus` | `100 - (보유 섹터 수 - 1) × 22`, 0~100 로 자름. 섹터 수는 최소 1 |
| 분산 `diversification` | `100 - 집중` |
| 정확 `accuracy` | **`50` 고정** — 아래 §3.3 |

근거·직관과 집중·분산은 보완쌍이라 각 쌍의 합이 항상 100이다. 섹터를 알 수 없는 종목은 섹터 수에 넣지 않는다.

### 3.2 캐릭터와 레벨

| 캐릭터 | 코드 | 판정 |
|---|---|---|
| 저격수 | `sniper` | 근거 ≥ 직관, 집중 ≥ 분산 |
| 전략가 | `strategist` | 근거 ≥ 직관, 집중 < 분산 |
| 승부사 | `fighter` | 근거 < 직관, 집중 ≥ 분산 |
| 탐험가 | `explorer` | 근거 < 직관, 집중 < 분산 |

5:5 동점은 근거·집중 쪽으로 귀속한다. 레벨은 정확으로 정한다: **3 = 70 이상, 2 = 40 이상, 1 = 40 미만.** 화면에는 `저격수 LV2` 처럼 붙여 쓴다.

### 3.3 정확이 고정값인 이유

정확은 사고판 시점이 맞았는지라 체결 5거래일 뒤 종가가 있어야 채점된다. 현재 화면에는 그 채점 경로가 연결돼 있지 않아 중간값 `50`으로 둔다 **[가정]**. 그래서 지금은 **모든 사용자가 LV2**로 나온다. 채점을 붙이면 `ACCURACY_PLACEHOLDER` 를 실제 값으로 바꾸고 레벨이 따라 움직인다.

`FOCUS_STEP_PER_SECTOR = 22` 도 확정 산식이 아닌 **[가정]** 상수다.

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

## 6. 서버 F9 — 남아 있으나 화면과 끊겼다

`web/app/api/profile/route.ts`, `web/shared/engine/behavior-profile.ts`, `web/shared/types/behavior-profile.ts`, `web/features/f9-archive/lib/narration.ts` 는 **그대로 있지만 화면이 부르지 않는다.**

- 능력치를 0~10 으로 내고 정확을 퍼센트+레벨로 채점하던 계약(`BehaviorProfileSnapshot`)은 현재 화면과 무관하다.
- 캐릭터 코드도 다르다. 서버는 승부사를 `challenger`, 화면 엔진은 `fighter` 로 쓴다.
- Luna 서술(`narration.ts`)도 화면에 나오지 않는다. F9 는 현재 **LLM 을 쓰지 않는다.**
- 되살릴 때는 두 계산 중 어느 쪽을 정본으로 삼을지부터 정한다. 두 벌을 동시에 유지하지 않는다.

## 7. 현재 알려진 불일치·미완료

- 정확이 `50` 고정이라 레벨이 항상 2다.
- 수익률 탭에서 `보유 종목 · 섹터별` 레일을 뺐다. 그 레일에서만 열리던 **섹터 상세 모달(`secModal*`)과 `retSectors` 계산이 화면에서 도달 불가**로 남아 있다. 되살리거나 지우는 판단이 필요하다.
- 가족 비교의 아빠(`dad`)는 앱 계정이 없어 값이 비어 있다.
- 시즌 기록 탭은 없다. 주별 누적은 카드 모아보기가 대신한다.
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
