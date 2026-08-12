# F10 — 4단계 설명 응답 구조 (SPEC 델타 초안)

> 2026-08-12 · 근거: DAPIE (CHI '23, doi:10.1145/3544548.3581369) §3.2.2·§4.2.3~4.2.5
>
> **이 파일은 임시 델타다.** 진행 중인 F10 안전 기반 작업(미커밋 13파일)이 머지된 뒤
> `SPEC.md` §3.2 응답 계약 · §5.1 요청 계약 · §9 교육 데이터 계약 · §10 검수에 흡수하고 삭제한다.
> 단일 원본은 언제나 `SPEC.md`다.

## 1. 채택 범위

교육형 답변에만 적용한다. 서비스 사용법(FAQ)·안전 대응·선제 도움은 기존 단답을 유지한다.

| 목적 | 4단계 적용 | 대상 수 |
|---|---|---:|
| 금융 개념 (용어 사전) | 적용 | 32 |
| 종목 사실 (승인 질문 4종) | 적용 | 51 × 4 = 204 |
| 섹터 설명 | 적용 | 13 |
| 서비스 사용법 (FAQ) | 미적용 | — |
| 본인 기록·성향·아카이브 | 미적용 | — |
| 안전 대응·선제 도움 | 미적용 | — |

**합계 249개 스크립트.**

## 2. 4단계 정의

논문의 조정 사다리(adjustment ladder)를 우리 데이터에 맞춰 4단계로 접었다.

| # | 단계 | 논문 대응 | 우리 규칙 |
|---:|---|---|---|
| ① | 1줄 설명 `brief` | Explanation sub-turn + G7 "요약 먼저" | **정확히 1문장** |
| ② | 이해 확인 재질문 `check` | Diagnosis question | **빈칸/선택형만.** 자유응답 금지 |
| ③ | 추가 설명 `detail` | Definition / Simplification Turn | **최대 2문장** |
| ④ | 예시 `example` | Term / Clause Exemplification Turn | **최대 2문장** |

논문의 `elicit question`("이 단어 알아?")은 넣지 않는다. 논문은 성인용 Merriam-Webster
정의를 쓰기 때문에 아이를 걸러낼 필요가 있었지만, 우리 용어 사전은 이미 아이 눈높이
정의라서 그 분기가 무의미하다.

`Feedback` 서브턴은 각 전이의 **첫 고정 문장**으로 구현한다 (논문 §3.2.2).

## 3. 전이 규칙

```
질문 도착
  └─ ① brief(1문장) + ② check 질문 + 선택지
       ├─ 정답 → "맞았어!" + 종료 (추천 질문 노출)
       └─ 오답 → "음, 그건 아니야." + ③ detail + "이제 알겠어?" + [알겠어 / 모르겠어]
                  ├─ 알겠어 → "좋아!" + 종료
                  └─ 모르겠어 → "그럼 예를 들어볼게." + ④ example + 종료
```

- 논문 §4.2.3대로 **조정은 항상 main 설명 뒤에** 온다. 이해한 아이의 몰입을 지키고,
  못 한 아이에게만 fallback을 준다.
- ④ 다음에는 더 내려가지 않는다. 종료하고 추천 질문으로 돌린다.
- 어느 단계에서든 아이가 새 질문을 입력하면 스크립트를 버리고 일반 라우팅으로 간다.

### 문장 예산

`text`는 게이트의 **3문장 상한**을 그대로 받는다.

| 턴 | `text` 구성 | 문장 |
|---|---|---:|
| ① | brief | 1 |
| ③ | feedback + detail | 1 + 2 = 3 |
| ④ | feedback + example | 1 + 2 = 3 |

`check` 질문과 선택지 라벨은 `text`가 아니라 `explain` 필드로 나가므로 예산에서 뺀다.

## 4. 타입 계약

### 4.1 `shared/types/chatbot.ts` 추가

```ts
export const EXPLAIN_STAGES = ["brief", "detail", "example"] as const;
export type ExplainStage = (typeof EXPLAIN_STAGES)[number];

export type ExplainChoice = { id: string; label: string };

/** 사전 저작·검수된 정적 데이터. 런타임 생성 금지. */
export type ExplainScript = {
  id: string; // "term:per" | "stock:KRX:005930:business" | "sector:semiconductor"
  brief: string; // ① 1문장
  check: {
    // ② 빈칸/선택형
    question: string;
    choices: readonly ExplainChoice[]; // 정답 1 + 오답 1~2
    answerId: string;
  };
  detail: string; // ③ 최대 2문장
  example: string; // ④ 최대 2문장
};

/** 서버가 내보내는 진행 중 턴. 아이는 choices 중 하나를 눌러 응답한다. */
export type ExplainTurn = {
  scriptId: string;
  stage: ExplainStage;
  prompt: string;
  choices: readonly ExplainChoice[];
};

export type ChatResponse = {
  text: string;
  suggestedQuestions?: string[];
  uiAction?: ChatUiAction;
  explain?: ExplainTurn; // 없으면 기존 단답과 동일
};
```

### 4.2 요청 계약 확장

```ts
export type ExplainReply = {
  scriptId: string;
  stage: Exclude<ExplainStage, "example">; // 방금 응답한 턴. example은 응답 못 받는다
  choiceId: string;
};

export type ChatRequest = {
  message: string;
  context: ChatContext;
  explain?: ExplainReply;
};
```

## 5. 안전 경계

### 5.1 대화 이력을 신뢰하지 않는다

클라이언트가 보내는 것은 **`scriptId` + `stage` + `choiceId` 세 값뿐**이다. 대화 이력도,
노드 포인터 테이블도 보내지 않는다. 스크립트 전체는 서버가 소유하고, 서버는 아래만 검증한다.

1. `scriptId`가 승인 스크립트 목록에 존재하는가
2. `stage`가 `brief` 또는 `detail`인가
3. `choiceId`가 **그 stage의 합법적 선택지**인가

하나라도 실패하면 `explain`을 버리고 일반 라우팅으로 폴백한다. 상태 머신 전이 검증이지
이력 신뢰가 아니다. `isAllowedUiAction`과 같은 패턴이다.

### 5.2 게이트 우회 차단 ⚠

`explain.prompt`와 `choices[].label`은 `response.text`가 아니라서 **런타임 출력 게이트를
타지 않는다.** 정적 데이터이므로 빌드 타임에 막는다.

- `shared/data/explain-scripts.test.ts`가 249개 스크립트의 `brief`·`check.question`·
  `choices[].label`·`detail`·`example` **전 필드**를 `gateChatOutput({ source: "fixed" })`에
  통과시킨다. 하나라도 실패하면 `npm run test` 실패.
- 문장 수 상한(①=1, ③④≤2)도 같은 테스트에서 강제한다.
- 런타임에는 `sanitizeExplainTurn`이 `scriptId` 허용 목록 존재 여부만 확인한다.

### 5.3 버튼 대신 타이핑했을 때 (구어체 처리)

선택지 버튼이 주 경로지만 입력창은 계속 열려 있으므로, 아이가 `ㅇㅇ`·`웅`·`몰라`처럼
직접 칠 수 있다. `lib/colloquial.ts`가 LLM 없이 판정한다.

1. 이모지를 낱말로 치환 (👍 → `응`)
2. NFKC 정규화·소문자·기호 제거
3. 3회 이상 반복을 2회로 축약 (`응응응응` → `응응`)
4. 사전 **정확 일치**만 허용 — 부분 일치는 쓰지 않는다

- `몰라`·`모르겠어`·`헷갈려`는 부정이 아니라 **"모르겠어" 선택지**로 매핑해 ④ 예시로 내려간다.
- `ㅋㅋ`·`ㄱㅊ`·`글쎄`는 의도적으로 판정하지 않는다.
- ⚠ **NFKC는 호환 자모 `ㅇ`(U+3147)을 조합용 자모 `ᄋ`(U+1100)으로 바꾼다.** 사전 상수도
  반드시 같은 `normalizeReply()`를 통과시켜 만들어야 초성체가 매칭된다.
- 판정 실패 시 추측하지 않는다. 새 질문처럼 보이면 일반 라우팅으로, 그 밖에는 같은 단계를
  유지한 채 선택지를 다시 보여준다(`reaskExplain`).

### 5.4 모델 호출

4단계 응답은 **전부 사전 저작 텍스트**다. 스크립트가 매칭되면 Luna를 호출하지 않는다.
SPEC §10.3의 "51종·13섹터 모두 OpenAI 호출 없이 기본 답변 가능"을 이 경로가 달성한다.

## 6. 소유 파일

| 위치 | 책임 | 상태 |
|---|---|---|
| `shared/types/chatbot.ts` | `ExplainScript`·`ExplainTurn`·`ExplainReply` 등 | 완료 |
| `features/f10-chatbot/lib/explain.ts` | 전이 순수 함수 + 응답 검증 + 되묻기 | 완료 |
| `features/f10-chatbot/lib/colloquial.ts` | 구어체 긍정·부정 판정 | 완료 |
| `features/f10-chatbot/lib/explain-scripts.ts` | 스크립트 데이터 + 주제 매칭 | **8개 저작, 84개 목표** |
| `features/f10-chatbot/lib/contracts.ts` | `ExplainReply` 파싱·검증 | 완료 |
| `features/f10-chatbot/lib/orchestrator.ts` | `explain` 경로 분기 | 완료 |
| `features/f10-chatbot/F10ChatbotDemo.tsx` | 선택지 버튼 렌더링 | 완료 |

새 런타임 의존성 없음. `docs/기술스택.md` 수정 없음.

### 6.1 제거된 병렬 구현

`dialogue-engine.ts`·`explanation-graph.ts`는 같은 논문의 **Guiding question**(§4.2.2)을
자연어 "응/아니"로 구현한 별개 설계였다. 4단계로 단일화하면서 제거했고, 주제 매칭 로직만
`explain-scripts.ts`로 옮겼다. Guiding question이 필요해지면 이 스펙을 먼저 고친다.

## 7. 저작·검수

SPEC §10.2 기존 워크플로에 스크립트 단계를 얹는다. 249개를 손으로 쓰지 않는다.

```
승인 사실 데이터(reviewed)
  → Luna 오프라인 배치로 4단계 초안 생성
  → 자동 검수 (전 필드 게이트 + 문장 수 + 정답/오답 유일성)
  → 사람 검수 (사실 정합·연령 적합·오답이 그럴듯한가)
  → reviewed 스크립트만 TypeScript 적재
```

- 런타임 생성이 아니라 **빌드 타임 저작**이므로 안전 게이트 경계는 그대로다.
- 오답 선택지도 논문 §4.2.3처럼 생성하되, **정답과 혼동되지 않고 사실도 아닌** 문구여야 한다.
- 51종목은 현재 전부 `draft`다. 사실 검수(SPEC §12.2 2순위)를 마친 종목만 스크립트를 만든다.

## 8. 완료 기준 (SPEC §14에 추가할 항목)

- 용어·종목·섹터 질문이 4단계 스크립트로 응답하고 모델을 호출하지 않는다.
- 오답 → `detail` → "모르겠어" → `example` 경로가 골든 패스 ②에서 동작한다.
- 위조된 `scriptId`·`stage`·`choiceId`가 전부 일반 라우팅으로 폴백한다.
- 249개 스크립트 전 필드가 출력 게이트와 문장 수 상한을 통과한다.
- `npm run build`와 `npm run test` 통과.
