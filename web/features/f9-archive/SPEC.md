# F9 — 가족 아카이브 기능 명세

> **현재 구현 단일 원본** · 2026-08-14 · 기준 커밋 `bb31517`
>
> 현행 동작은 **`web/public/ui/app.html` 렌더링 → `/api/profile` → `shared/engine/behavior-profile.ts` → 이 문서** 순으로 확인한다. 제품 목표·법무·전역 레드라인은 `docs/영웅키움_기획_통합문서_v2.md`를 따른다.

## 1. 현재 범위

F9 사용자 화면은 `app.html` 안의 `archive` 화면이며 탭은 네 개다.

1. **성향 리포트**: 능력치 5개 오각형, 캐릭터, 근거 분포, Luna/폴백 서술
2. **수익률**: 현재 계정의 총자산·손익·보유·현금
3. **가족 비교**: 자녀·부모 캐릭터와 능력치 5개 병치
4. **시즌 기록**: 현재 시즌 매수·매도·메모·상세 열람 건수와 4주차 잠금 카드

가족 체결 마커는 F2 차트 안에 있고, 가족 거래 피드는 F11 React 오버레이다. 현재 아카이브 탭 안에 피드 화면이나 마커 상세가 포함돼 있다고 설명하지 않는다.

## 2. 소유권과 실행 경로

| 영역 | 실제 위치 | 책임 |
|---|---|---|
| 아카이브 화면 | `web/public/ui/app.html` | 네 탭 렌더링과 `/api/profile` 호출 |
| 프로필 Route Handler | `web/app/api/profile/route.ts` | 시드+라이브 입력 조립, 시세·종가 주입, 엔진·서술 호출 |
| 엔진 | `web/shared/engine/behavior-profile.ts` | 능력치·캐릭터·레벨·분포·계획일치 계산 |
| 타입 | `web/shared/types/behavior-profile.ts` | `BehaviorProfileSnapshot` 계약 |
| 서술 | `web/features/f9-archive/lib/narration.ts` | Luna 호출, 출력 게이트, 고정 폴백 |
| 라이브 원본 | `localStorage["kw_proto_v1"]` | `acc`·`records`·`sellRecords`·`events` |
| 시드 원본 | `web/shared/store/family-trade-seed.ts` | 부모·자녀 과거 거래와 탭 열람 |
| 종가 | `web/app/api/quote/stock-candles.ts` | 정확력 채점용 저장 일봉 |

현재 `web/features/f9-archive/`에는 화면 컴포넌트가 없다. UI가 기능 폴더로 이미 이관됐다고 가정하지 않는다.

## 3. 현재 요청 흐름

```text
app.html에서 아카이브 진입
  → 자녀·부모 각각 POST /api/profile { account, narrate:false, state }
  → 두 스냅샷을 먼저 렌더링
  → 자녀·부모 각각 POST /api/profile { account, narrate:true, state }
  → Luna 또는 폴백 서술로 교체
```

- 첫 진입은 최대 네 번 요청한다. `profiles`가 준비되면 같은 화면 재진입에서는 다시 요청하지 않는다.
- 새 매수·매도 후 `profiles`를 비워 다음 아카이브 진입에서 재계산한다.
- 요청 본문은 브라우저가 `account`와 부모·자녀 전체 로컬 상태를 보낸다. 현재 `/api/profile`은 `kw_uid` 세션으로 해당 계정 권한을 묶지 않는다.
- 시드 거래·시드 탭 열람과 화면 라이브 기록을 한 표본으로 합친다.

## 4. 엔진 입력

### 4.1 라이브 입력

- 매수: 현재 계정의 `records` 중 `order_status === "filled"`만 사용한다.
- 매도: 현재 계정의 `sellRecords`를 사용한다. 현재 변환기는 `order_status`를 검사하지 않아 대기 매도도 들어갈 수 있다.
- 탭 열람: `chart_detail_opened`, `news_detail_opened`, `info_detail_opened`를 차트·뉴스·기업정보로 변환한다. 현재 프론트는 차트와 뉴스만 생산하고 기업정보 상세 이벤트는 생산하지 않는다.
- 보유·현금: `acc[account].holdings`와 `acc[account].cash`를 사용한다.
- 현재가·섹터·5거래일 종가: 서버가 별도로 주입한다.

### 4.2 금지 입력

- F10 대화 원문·질문 횟수·선제 발화 로그
- 모델이 추정하거나 생성한 수치
- 가족 코멘트와 좋아요
- 외부 투자 평가·주가 전망

## 5. 능력치 5개

| 능력치 | 범위 | 실제 산식 |
|---|---:|---|
| 근거력 `evidence` | 0~10 정수 | 매수 전 같은 종목의 10초 이상 유효 탭을 2종 이상 본 체결 매수 비율 × 10, 반올림 |
| 직관력 `intuition` | 0~10 | `10 - evidence` |
| 집중력 `focus` | 0~10 정수 | 보유 섹터·현금비중 환산 (§5.1) |
| 분산력 `diversification` | 0~10 | `10 - focus` |
| 정확력 `accuracy` | 0~100 정수 | 채점된 매수·매도의 적중률 퍼센트, 반올림 |

### 5.1 집중력 환산

- 보유 섹터 0개: 1점
- 1·2·3개: 각각 9·8·7점
- 4개 이상: `max(1, 8 - 섹터 수)`
- 현금비중이 50% 이상이면 위 점수에서 2점을 빼되 최저 1점

이 곡선은 코드에 구현된 현재 [가정]이다. 보유 평가액은 현재가를 우선하고 없으면 평균단가를 쓴다.

### 5.2 정확력과 레벨

- 매수: 체결가보다 5거래일 뒤 종가가 높으면 적중
- 매도: 매도 당일 또는 직전 거래일 종가보다 5거래일 뒤 종가가 낮으면 적중
- 종가가 부족하면 `pendingTradeCount`에 넣고 적중률에서 제외
- 채점 거래가 0건이면 정확력 50으로 시작
- 레벨 3: 적중 비율 `>= 2/3`
- 레벨 2: 적중 비율 `>= 1/3` 및 `< 2/3`
- 레벨 1: 적중 비율 `< 1/3`

오각형에서는 정확력을 10으로 나눠 다른 네 축과 같은 반지름으로 그린다.

## 6. 캐릭터와 관찰 상태

| 캐릭터 | 코드 | 판정 |
|---|---|---|
| 저격수 | `sniper` | 근거 ≥ 직관, 집중 ≥ 분산 |
| 전략가 | `strategist` | 근거 ≥ 직관, 집중 < 분산 |
| 승부사 | `challenger` | 근거 < 직관, 집중 ≥ 분산 |
| 탐험가 | `explorer` | 근거 < 직관, 집중 < 분산 |

- 5:5 동점은 근거·집중 쪽으로 귀속한다.
- 체결 매수 3건 미만은 `observationState: "initial"`이고 `character`·`level`은 `null`이다.
- 캐릭터에는 우열이 없다. 화면은 “정답은 없어!”를 함께 표시한다.

## 7. 엔진 출력 계약

```ts
type BehaviorProfileSnapshot = {
  userId: string;
  periodStart: string;
  periodEnd: string;
  sampleSize: number;
  abilities: {
    evidence: number;
    intuition: number;
    focus: number;
    diversification: number;
    accuracy: number;
  };
  character: "sniper" | "strategist" | "challenger" | "explorer" | null;
  level: 1 | 2 | 3 | null;
  gradedTradeCount: number;
  pendingTradeCount: number;
  reasonDistribution: Record<string, number>;
  actionAlignment: number;
  observationState: "initial" | "ready";
};
```

`actionAlignment`는 `plan_match`가 boolean인 매도 중 `true` 비율이며 판정 가능한 매도가 없으면 0이다.

## 8. 화면별 실제 데이터

### 8.1 성향 리포트

- 서버 스냅샷: 능력치, 캐릭터, 판정 근거, 관찰 상태, 서술
- 로컬 기록: “왜 샀는지” 분포와 매수 횟수
- 로컬 분포는 서버가 합친 시드와 미체결 제외 규칙을 공유하지 않아 스냅샷 표본과 다를 수 있다.

### 8.2 수익률

`app.html`의 현재 계정 로컬 지갑으로 총자산·현금·보유·평가손익을 계산한다. LLM을 거치지 않는다.

### 8.3 가족 비교

자녀·부모 `/api/profile` 응답을 나란히 보여 준다. “양쪽이 공개에 동의했어요” 문구는 고정 표시지만 실제 동의 상태를 조회하지 않는다.

### 8.4 시즌 기록

현재 시즌의 로컬 매수·매도·메모·상세 열람 횟수를 보여 주고, 시즌 종료 카드는 4주차까지 잠긴 상태로 그린다. 과거 시즌 카드 누적·오각형 겹치기·서버 저장은 아직 없다.

## 9. LLM 경계

F9는 `gpt-5.6-luna`를 서술 생성에만 사용한다.

```text
BehaviorProfileSnapshot
  → Luna 1회
  → shared/llm/filter
  → 통과 시 2~3문장
  → 실패·관찰 초기면 고정 폴백
```

- 모델 입력은 엔진 스냅샷 요약뿐이다. 원시 거래·가족 대화·수익률 전망을 전달하지 않는다.
- 능력치·캐릭터·레벨·모든 숫자는 엔진 값만 허용한다.
- 추천, 매매시점, 목표가, 수익률 전망, 가족 간 우열, 훈계를 금지한다.

## 10. 현재 알려진 불일치·미완료

- 화면은 엔진 필드 `level` 대신 존재하지 않는 `starGrade`를 읽어 정확 레벨·별 표기가 나오지 않는다.
- 화면의 `CHARACTER_CARD`에는 이모지가 없어 캐릭터 이모지 자리도 비어 있다.
- 메인 프로토타입의 전역 계정 스위처가 없어 부모의 단독 성향 리포트로 전환할 수 없다. 가족 비교 탭에서는 두 응답을 함께 볼 수 있다.
- 라이브 대기 매도도 엔진 매도 입력에 포함될 수 있다.
- 가족 비교 동의 문구는 실제 권한·동의 데이터와 연결되지 않았다.
- 시즌 기록은 현재 집계와 잠금 카드뿐이며 시즌별 누적 저장이 없다.
- `app.html`의 근거 분포와 서버 스냅샷의 표본 원천이 다르다.

## 11. 금지 사항

- 캐릭터를 우열·성적·등수로 표현하지 않는다.
- 매수 3건 미만 사용자의 캐릭터·레벨을 단정하지 않는다.
- 정확 레벨 외 능력치를 실력 등급으로 표현하지 않는다.
- 수익률에 LLM 해석·예측을 붙이지 않는다.
- 기능 폴더에서 엔진 계산이나 공용 타입을 복제하지 않는다.

## 12. 완료 기준

- 성향·수익률·가족 비교·시즌 기록 네 탭이 실제 `app.html` 데이터 흐름과 일치한다.
- 엔진 지표별 테스트가 실제 산식과 경계를 고정한다.
- 화면이 `level`과 캐릭터 표현을 실제 타입 계약으로 렌더링한다.
- 시연 중 시장가 체결 후 다음 아카이브 진입에서 스냅샷이 다시 계산된다.
- Luna 서술이 공통 필터를 통과하거나 고정 폴백으로 닫힌다.
- `web/`의 `npm test`와 `npm run build`가 통과한다.
