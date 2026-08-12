# MatrAIx 페르소나 행동 신호 평가

기존 키웅이 응답·선제 도움 엔진은 바꾸지 않고, MatrAIx 아동 표본을 붙여 `switch`·`dwell`·`lossRevisit`가 **도움이 필요한 행동과 의도적 행동을 구분하는지** 확인하는 오프라인 평가다.

## 지금 연결한 범위

- 원본: [MatrAIx Persona 8B](https://github.com/MatrAIx-ai/MatrAIx-Persona-8B/tree/3202a0bf6134776735c4ab4d50de79be8c6a5e8b)
- 표본: 원본 개발 표본의 `5-12` 6명 + `13-17` 6명
- 데이터: 이름·성별·지역·언어는 제외하고 행동 해석에 필요한 15개 차원만 스냅샷
- 엔진: `web/shared/engine/proactive-help.ts`를 그대로 호출
- 비용·개인정보: 83억 전체 데이터 다운로드, 외부 API 호출, 실제 사용자 데이터 사용 없음

MatrAIx의 1,290차원 스키마 전체를 제품 런타임에 넣지 않는다. 이 평가는 [원본 차원 스키마](https://github.com/MatrAIx-ai/MatrAIx-Persona-8B/blob/3202a0bf6134776735c4ab4d50de79be8c6a5e8b/persona/schema/dimensions.json) 중 연령, 투자 숙련도, 의사결정 방식, 불안, 주의 지속, 스트레스 등 필요한 차원만 사용한다.

## 평가 설계

신호마다 다음 4건을 고정한다.

| 관찰자 라벨 | 임계값 통과 | 기대 판정 |
|---|---|---|
| 실제로 도움 필요 | 통과 | true positive |
| 실제로 도움 필요 | 바로 아래 | false negative 발견 |
| 의도적 탐색·검토 | 통과 | false positive 발견 |
| 의도적 탐색·검토 | 바로 아래 | true negative |

따라서 12건은 실제 사용자 분포를 재현하는 표본이 아니라 임계값의 식별 한계를 일부러 드러내는 **경계 테스트 세트**다. 관찰자 라벨은 페르소나 속성만으로 자동 추론하지 않고 각 시나리오의 명시적 상황으로 정한다.

## 현재 고정 결과

| 범위 | TP | FP | TN | FN |
|---|---:|---:|---:|---:|
| 전체 12건 | 3 | 3 | 3 | 3 |
| 각 신호 4건 | 1 | 1 | 1 | 1 |

이 결과의 뜻은 현재 규칙이 고장났다는 것이 아니다. 현재 엔진은 명세대로 **행동 패턴**을 정확히 잡지만, 같은 패턴이 헤맴인지 계획된 탐색인지는 이벤트만으로 구분할 수 없다는 뜻이다. 특히 `dwell`은 체류 이유, `lossRevisit`은 재진입 목적, `switch`는 비교 학습 여부가 추가 관찰 후보가 된다.

## 실행

`web`에서 실행한다.

```powershell
npx tsx ../records/f10-proactive-persona-sim/proactive-help-evaluation.test.ts
npx tsx ../records/f10-proactive-persona-sim/run.ts
```

첫 명령은 표본·균형·오탐·미탐·재현성을 검증한다. 두 번째 명령은 혼동행렬과 12개 개별 판정을 마크다운으로 출력한다.

## 다음 단계: 실제 브라우저 페르소나 런

MatrAIx는 [Web task 계약](https://github.com/MatrAIx-ai/MatrAIx-Persona-8B/blob/3202a0bf6134776735c4ab4d50de79be8c6a5e8b/application/task-spec/web/README.md)에서 페르소나별 브라우저 궤적과 결과물을 다룬다. 실제 행동 생성까지 검증할 때는 다음 순서로 확장한다.

1. 현재 12개 표본을 그대로 사용해 3개 고정 시드, 총 36회 실행한다.
2. 페르소나 에이전트가 실제 데모 화면을 조작하게 하고 앱이 만든 `ChatBehaviorEvent[]`만 수집한다.
3. 엔진 발화 여부를 가린 독립 관찰자가 `도움 필요 / 의도적 행동 / 판정 불가`를 라벨링한다.
4. 시드별 일치도, 오탐, 미탐을 보고 사람 테스트에 넘길 후보만 남긴다.

실제 브라우저 런은 현재 평가에 포함하지 않는다. 시나리오 이벤트는 사람이 작성했으므로 페르소나가 그 행동을 실제로 생성한다는 증거가 아니며, 이 결과를 아동 정확도나 임계값 확정 근거로 사용하면 안 된다. 프로젝트에서 라이브 LLM 런을 붙일 때도 모델은 `gpt-5.6-luna`만 사용하고 공용 LLM 경계를 별도 claim한 뒤 연결한다.
