# DAPIE 논문 추출 (CHI 2023)

> 원문: Yoonjoo Lee, Tae Soo Kim, Sungdong Kim, Yohan Yun, Juho Kim.
> **DAPIE: Interactive Step-by-Step Explanatory Dialogues to Answer Children's Why and How Questions.**
> CHI '23, 2023-04-23~28, Hamburg. [doi:10.1145/3544548.3581369](https://dl.acm.org/doi/10.1145/3544548.3581369) · 22쪽 · Gold OA
>
> 소속: KAIST School of Computing (Lee·Kim·Yun·Kim), NAVER AI Lab (Sungdong Kim)
> PDF: <https://kixlab.github.io/website-files/2023/chi2023-childQA-paper.pdf>
> 피인용 47회 / influential 5회 (2026-08-12 기준)
>
> **용도**: F10 키웅이의 4단계 설명 응답 구조 근거. 구현 계약은
> `web/features/f10-chatbot/SPEC-explain-4stage.draft.md` → 머지 후 `SPEC.md`가 소유한다.
> 이 파일은 참고 문헌 정리이며 제품 결정의 원본이 아니다.
>
> 영문 인용은 PDF에서 직접 추출했다. 추출 과정에서 깨진 합자(ligature)는 복원했다.
> 인용 뒤 괄호는 논문 절 번호다.

---

## 1. 이름과 문제 정의

**DAPIE = Dialogic Answering via Piecemeal Interactive Explanations.**

아이는 "왜/어떻게"를 물으며 세계의 인과 모델을 만든다. 스마트 스피커·음성 비서는 부모나
교사보다 **항상 대기 중**이라 응답자로서 가치가 크지만, 답변이 성인용 파이프라인 산물이라
아이에게 부적합하다.

논문이 든 실제 사례 — "Why do polar bears have white fur?"에 대한 Google Assistant 답:

> "Polar bears have white fur so that they can camouflage into their environment. Their coat is
> so well camouflaged in Arctic environments that it can sometimes pass as a snow drift.
> Interestingly, the polar bear's coat has no white pigment; in fact, a polar bear's skin is black
> and its hairs are hollow." (§1)

문제 세 가지:

1. 아이에게 없는 **선행 지식**을 요구한다
2. 복잡한 **추론 사슬**을 스스로 잇게 한다
3. 한 번에 다 쏟아내서 **아이가 무엇을 이해하지 못했는지 파악할 수 없다**

> These types of long responses are challenging for children to understand because they often
> require the child to possess the prior knowledge needed and to interpret possibly complex
> reasoning chains. Furthermore, existing CAs provide long responses at once without prompting,
> which leads to them not being able to identify what a child did not understand or to engage
> them in a conversation. (§1)

## 2. 초록

> Children acquire an understanding of the world by asking "why" and "how" questions.
> Conversational agents (CAs) like smart speakers or voice assistants can be promising
> respondents to children's questions as they are more readily available than parents or teachers.
> However, CAs' answers to "why" and "how" questions are not designed for children, as they can
> be difficult to understand and provide little interactivity to engage the child. In this work, we
> propose design guidelines for creating interactive dialogues that promote children's engagement
> and help them understand explanations. Applying these guidelines, we propose DAPIE, a system
> that answers children's questions through interactive dialogue by employing an AI-based
> pipeline that automatically transforms existing long-form answers from online sources into such
> dialogues. A user study (N=16) showed that, with DAPIE, children performed better in an
> immediate understanding assessment while also reporting higher enjoyment than when
> explanations were presented sentence-by-sentence.

---

## 3. 설계 가이드라인 (§3)

### 3.1 도출 방법

Google Scholar·ACM DL 키워드 검색(`question-asking behavior of children`,
`answering children's questions`, `explanations for children`) → 저자 3인 반복 귀납 코딩 →
**아동교육 전문가 4인 컨설팅**(석사 1·박사 3, 2인은 아동 교육 5년 이상)으로 검증·확장.

전문가 공통 의견:

- 구두 설명 시 **"decompose information into smaller steps"** — 아이의 주의 지속 시간과 작업 기억 한계 때문
- 생략 판단 기준 두 가지: **importance**(아이가 알아야 할 것) vs **acceptance**(아이가 이해할 수 있는 것)
- 작은 덩어리를 준 뒤 이해했는지 물어라 — "further information if the child understands, or provide adjusted explanations if they do not"
- 이해 확인은 실무에서 **true/false 또는 객관식**을 자주 쓴다

### 3.2 설명 단위 체인 구성 (§3.2.1)

| 단계 | 내용 |
|---|---|
| **Decomposing** | 복잡한 설명을 단순 단위로 쪼개 인지 부하를 낮춘다. 요소·개체·관계를 풀어 각각 독립 처리하게 한다 |
| **Identifying** | 이해에 필수인 요소를 골라 표시한다. 아이가 그것을 인지하고 집중해 관계를 추론하게 한다 |
| **Connecting** | 누적적·인과적으로 제시한다. 한 단위가 다음 단위로 이어지는 방식을 명시한다 |

### 3.3 대화 구조 — 한 턴 = 3개 서브턴 (§3.2.2)

> We propose a dialogue structure where each turn of dialogue is composed of three sub-turns:
> **Feedback, Explanation, and Question**. The explainer first provides feedback by building upon
> the child's utterance. Then, the explainer provides an explanatory unit relevant to the child's
> answers. The explainer then ends the turn with a question that invites the child to engage in the
> dialogue. For example, when a child cannot understand an explanation about how bees make
> honey, the explainer can respond with *"That's alright. Nectar is a sugary liquid that flowers
> produce. Do you get that?"* where the sentences represent feedback, explanation, and question,
> respectively.

- **Feedback** — 아이 응답에 대한 논평. 교정(contingency)과 시도 칭찬(encouragement)
- **Explanation** — `extension`(새 정보로 확장) / `adjustment`(같은 정보를 아이 수준에 맞춰 조정)
- **Question** — 아래 3역할

### 3.4 Table 1 — 설명 전략 23개 (G1~G23)

**Local strategies** (개별 설명 서브턴에 적용):

| 전략 | 가이드라인 |
|---|---|
| Simplifying | **G1.** 아이의 이해 수준에 맞는 언어를 쓴다 · **G1-1.** 과학·기술·격식 용어를 쉬운 말로 바꾼다 |
| Providing examples | **G2.** 새롭거나 낯선 개념을 나타내는 다양한 예를 준다 · **G3.** 원 개념과 예시의 관계를 명확히 설명해 일반화를 돕는다 · **G4.** 예시 선택 시 아이의 선행 지식을 고려한다 · **G5.** 원 개념과 유사도가 높은 예시를 준다 |
| Summarizing | **G6.** 개념의 핵심 원리를 분명히 밝힌다 · **G7.** 세부로 들어가기 전에 **즉각적이고 요약된 답을 먼저 준다** |
| Providing analogies | **G8.** 비교 대상 선택 시 아이의 관심사·경험을 고려한다 · **G9.** 원본과 대상의 유사성을 명시적으로 인지시킨다 · **G10.** 원본과 유사한 개체·관계를 가진 대상을 고른다 |
| Providing personifications | **G11.** 낯설거나 복잡한 개체를 의인화해 설명한다 · **G12.** 의인화는 대상이 인간과 유사할 때 더 효과적이다 |
| Representing / demonstrating | **G13.** 표현과 시연으로 개념을 시각화한다 |

**Global strategies** (대화 전체에 적용):

| 전략 | 가이드라인 |
|---|---|
| Textual simplification | **G14.** 평균적 아이 기준으로 모든 정보를 단순화한다 · **G15.** (어휘) 어려운 용어를 쉬운 말로 · **G16.** (구문) 문장 구조를 단순화 · **G17.** (길이) 중간 길이 문장을 쓴다 |
| Global adjustment | **G18.** 아이의 선행 지식 수준에 맞춰 조정 · **G19.** 아이의 개인 경험에 맞춰 조정 · **G20.** 앞 턴의 조정을 대화 전체에 전파 |
| Explicitly mentioning coherence | **G21.** 턴 사이 응집성을 명시하거나 연결어를 쓴다 (예: "before that", "then") · **G22.** 인과 관계는 사건이 결과로 이어지는 방식을 명시한다 (예: "When all the pieces touch, energy can travel from the battery to the light") |
| Highlighting relevancy | **G23.** 핵심 내용으로 주의를 되돌려 깊은 처리를 유도한다 |

> DAPIE 구현에 실제 채택된 것: **Simplifying, Providing examples, Textual simplification,
> Explicitly mentioning coherence.** 유추·의인화는 예시화와 유사하고 적용 범위가 좁아 제외했다.

### 3.5 Table 2 — 질문의 3역할

| 역할 | 설명 | 전략 |
|---|---|---|
| **Guiding** | 아이의 초점을 좁히거나 다른 정보를 고려하도록 유도해 이해를 비계(scaffold)한다 | 무슨 정보가 빠졌는지·무엇을 물어볼 수 있는지 알려준다 · 앞 턴의 세부 정보로 안내한다 |
| **Diagnosis** | 아이가 이해했는지 진단해 실패 시 개입한다. **아이가 설명 내용을 적용하도록 유도할 때 더 효과적·신뢰할 수 있다** | **한 조각만 빼고 다 준 뒤 빈칸을 채우게 한다** · 예측하게 한다 · 스스로 설명하게 한다 · 유사도가 다른 항목들에 사실이 일반화되는지 판단하게 한다 |
| **Eliciting** | 선행 지식을 확인해 더 친숙한 지식으로 설명을 조정한다 | 아는 것을 묻는다 · 경험 기반 질문을 한다 |

> DAPIE 구현에 실제 채택된 것: **빈칸 채우기(Diagnosis), 아는 것 묻기(Eliciting), 안내 질문(Guiding).**

---

## 4. 시스템 파이프라인 (§4)

### 4.1 Step 1 — 롱폼 답변을 설명 단위 체인으로 (§4.1)

| 순서 | 처리 | 모델 |
|---|---|---|
| Split | 답변을 문장 단위로 분해 | — |
| Identify | 문장을 `summary`/`answer`/`example`/`auxiliary` 역할로 분류. 앞 둘 = **main unit**, 뒤 둘 = **detail unit** | T5 기반 discourse analyzer (Xu et al.) |
| Connect | main unit을 순서대로 잇고, detail unit은 가장 잘 이어지는 main에 **옵션 가지**로 붙인다 | BERT base, next sentence prediction |

- "문장 1개 = 논점 1개" 가정은 BBC Science Focus QA 10쌍을 저자 2인이 정성 분석해 검증했다.
- 원문 순서를 그대로 믿지 않는다 — detail unit이 관련 main unit과 인접하지 않은 경우가 많았다.

### 4.2 Step 2 — 상호작용·이해 가능성 증강 (§4.2)

핵심 기법은 **turn inpainting**. Dai et al.의 dialog inpainting을 확장해, "CA와 아이가
`feedback-explanation-question` 서브턴으로 대화하는" 템플릿의 `[BLANK]`를 **GPT-3** few-shot으로
채운다. 템플릿은 QA 10쌍으로 프롬프트 엔지니어링을 반복해 확정했다.

| 모듈 | 방법 |
|---|---|
| **Simplify** | **MUSS**(어휘·구문·길이 제어 가능)로 1차 → 어휘 단순화가 부실·부정확해서 **GPT-3로 2차** |
| **Guiding Q** | 연속 두 턴 `t_i`, `t_i+1` 사이 `[BLANK]`를 채워 "더 알고 싶어?"를 만든다. 응집성 구문도 같은 방식으로 생성 |
| **Diagnosis Q** | **빈칸 채우기형만.** 두 종류의 난점(**낯선 용어**, **복잡한 인과관계**)을 찾아 blank로 삼고, 오답 선택지도 GPT-3로 생성 |
| **용어 조정** | elicit Q → 안다면 재단순화 / 모른다면 **Merriam-Webster API로 정의 검색**(할루시네이션 회피) → 그래도 모르면 용어 예시 |
| **인과 조정** | 재단순화 → 절(clause) 기반 유사 인과관계 예시. **원인 기준으로 생성**(결과 기준은 예시가 넓고 무관해짐) |

LLM이 유해어를 생성할 수 있으므로 매 출력을 검사하고 재생성한다 — 다만 연구 기간 중 재생성이
필요한 경우는 없었다.

### 4.3 조정 사다리 — F10이 채택한 부분 (§4.2.3~4.2.5)

**분기 규칙 원문:**

> In the dialogue tree, diagnosis questions are asked **after the main turns**. For correct answers,
> the dialogue provides contingency feedback like *"That's correct!"* and asks the guiding question.
> For incorrect answers, the dialogue provides feedback (i.e., *"Hmm, I don't think so"*) and moves
> to adjustment turns according to the difficulty (i.e., term or cause-effect). **We provide
> adjustment turns after the main turns as our consulted experts suggested that children should
> first be provided with information relevant to their question and then, if needed, provided with
> support. They explained that this retains the engagement of children who can understand, while
> guaranteeing fallback support for those who cannot.** (§4.2.3)

**빈칸형만 쓰는 이유:**

> We chose to generate fill-in-the-blank questions as the other strategies require free-form
> responses that are difficult to verify with existing techniques. (§4.2.3)

**조정 턴 (§4.2.4):**

> **Simplification Turn.** If the child answers that they know the term, the pipeline offers a more
> simplified explanation. For this, the explanation in the main turn is simplified again using the
> same simplification method as in Section 4.2.1.
>
> **Definition Turn.** If the child does not know the term, the pipeline provides an extension
> explanation for the term. As LLMs can hallucinate, we retrieve definitions from a verified source,
> Merriam-Webster API, instead of generating them. After retrieving, our pipeline simplifies the
> definitions using our simplification method. The definition turn provides this definition and a
> simple diagnosis question asking the child if they understood or not. **A simpler diagnosis is used
> to not exhaust children with frequent quizzing.**
>
> **Term Exemplification Turn.** If the child could not understand the definition, the CA should
> provide an additional adjustment to help them understand.

**인과 조정 (§4.2.5):**

> **Clause Exemplification Turn.** When simplification is insufficient, the pipeline creates an
> example of another similar cause-effect relationship. We generated examples based on the causes
> as we observed that generating from the effects lead to broader and more unrelated examples.

경로별 노드 수:

- **용어 경로 (5단계)**: 설명 → 진단 질문 → elicit 질문 → 정의 → 용어 예시
- **인과 경로 (4단계)**: 설명 → 진단 질문 → 재단순화 → 절 예시

### 4.4 Table 3 — GPT-3 프롬프트 템플릿 원문

```
(A) Generate Guiding Question
CA:    [Explanation sub-turn in t_i]
CA:    [BLANK]
Child: Yes, I want to know more about it.
CA:    [Explanation sub-turn in t_i + 1]

(B) Generate Coherency Phrase
       [Turns t_1 to t_i-1]
CA:    [Explanation sub-turn in t_i]
CA:    [Guiding question from t_i to t_i + 1]
Child: Yes, I want to know more about it.
CA:    [BLANK] [Explanation sub-turn in t_i + 1]

(C) Generate Diagnosis Question
CA:    [Explanation sub-turn in t_i]
CA:    Let me ask you a question. [BLANK]
Child: The answer is [Answer for t_i].

(D) Generate Elicit Question
CA:    [Explanation sub-turn in t_i]
CA:    [BLANK]
Child: Hmm. I don't know.
CA:    It's okay. [Definition for term in t_i]

(E) Generate Term-based Example
CA:    [Definition for term in t_i] Did you get it?
Child: No, I couldn't understand it.
CA:    Don't worry. Let me give you examples. As you know well,
       [BLANK]. They are all [Term in t_i].

(F) Generate Clause-based Example
CA:    [Explanation sub-turn in t_i] Did you get it?
Child: No, I couldn't understand it.
CA:    Don't worry. Let me give you an example.
       [Clause in t_i] is like [BLANK]
```

### 4.5 인터페이스 (§4.3)

- 웹 기반. CA가 발화(TTS)하고 **텍스트도 함께 표시**한다(읽을 수 있는 아이 배려)
- **말하기 속도를 기본보다 낮춘다** — 아이에게 과부하를 주지 않기 위해
- 발화 후 **짧게 멈춰** 생각·처리할 시간을 준다
- 발화가 끝나면 선택지를 **하나씩 읽으며** 아래에 노출한다
- **자유 음성 입력을 쓰지 않는다.** 아동 음성 인식이 오류가 잦아, 인식 오류가 이해를 방해하지
  않도록 클릭으로 의도를 정확히 표현하게 했다. 전문가도 설명 이해만으로 이미 인지 부담이 큰
  아이에게 자유 응답을 요구하지 말라고 조언했다
- 선택지를 **1차 클릭하면 다시 읽어주고, 2차 클릭해야 확정**된다 — 놓쳤거나 잊은 아이 배려

---

## 5. 기술 평가 (§5)

**테스트 데이터 32쌍**: 출처 2종(BBC Science Focus = 전문가 생성, ELI5 = 사용자 생성) ×
도메인 4종(자연현상·생물·물리·문화사회) × 질문 유형 2종(why·how) × 2.

**평가 방법**: ACUTE-EVAL 방식. 같은 입력에서 나온 두 출력(우리 vs 베이스라인)을 나란히 보여주고
서브모듈별 측정 질문에 답하게 한다. 데이터당 평가자 3인·다수결. MTurk(미국, 승인율 98%+),
30분·$6. 평가자 간 일치도 Fleiss κ=0.338 (fair).

**베이스라인**: 단순화 = MUSS · 예시화 = GPT-3 zero-shot · 질문 생성 = QuAC·QReCC·DailyDialog·
Taskmaster로 파인튜닝한 T5-large dialogue inpainting.

| 서브모듈 | 측정 항목 | Ours | Baseline | Tie |
|---|---|---:|---:|---:|
| 단순화 | QS1 쉬운 어휘 | 52% | 34% | 12% |
| | QS2 단순한 구조 | 54% | 32% | 14% |
| | QS3 불필요 정보 제외 | 57% | 21% | 22% |
| 예시화 | QC1 이해에 도움 | 49% | 40% | 11% |
| | QC2 아이에게 친숙 | 46% | 38% | 16% |
| | QC3 유사성·차이 규칙 준수 | 42% | 32% | 26% |
| | QC4 맥락 관련성 | 49% | 31% | 20% |
| Guiding Q | QG1 아이가 이해 가능 | 81% | 9% | 10% |
| | QG2 교사다움 | 80% | 11% | 9% |
| | QG3 문법 정확성 | 88% | 6% | 6% |
| | QG4 앞뒤 연결 적절성 | 76% | 16% | 8% |
| Diagnosis Q | QD1 아이가 이해 가능 | 55% | 27% | 18% |
| | QD2 교사다움 | 70% | 21% | 9% |
| | QD3 문법 정확성 | 38% | 17% | 45% |
| | QD4 이해 점검 적절성 | 69% | 17% | 14% |
| Elicit Q | QE1 아이가 이해 가능 | 64% | 14% | 22% |
| | QE2 교사다움 | 83% | 9% | 8% |
| | QE3 문법 정확성 | 72% | 21% | 6% |
| | QE4 선행 지식 점검 효과 | 53% | 17% | 30% |
| | QE5 후속 답변과의 정합 | 64% | 14% | 22% |

- 질문 생성의 격차가 큰 이유: 베이스라인 모델은 학습 시 **아동 대화를 본 적이 없다**
- 단순화·예시화의 격차는 **격식 있는 전문가 문서**와 **물리 도메인**에서 더 컸다
- 할루시네이션: 단순화 10%(베이스라인과 동일), 예시화 20%(베이스라인 30%). 예시는 원 설명을
  바꾸지 않고 마지막 수단으로만 제공되므로 부정적 영향이 가장 작다고 논문은 평가

---

## 6. 사용자 스터디 (§6)

### 6.1 설계

- **N=16**, 만 5~7세 (5세 2 · 6세 5 · 7세 9), 여아 5명
- 인종: 아시아계 50% · 백인 18.75% · 흑인 12.5% · 기타 18.75%
- **가정 언어: 영어 62.5% / 한국어 37.5%**
- 부모 학력 학사 이상 81.25% · CA 사용 빈도 "드물게" 50%
- 사전에 QUILS(Quick Interactive Language Screener)로 영어 능력 스크리닝
- 원격(Zoom), 각 60분, $50 보상, IRB 승인
- **베이스라인**: 같은 UI에 원문을 **문장 하나씩** 제시하고 "Okay" 버튼만 제공.
  기존 음성 CA보다 이미 더 상호작용적이므로 공정한 비교라고 논문이 주장
- 참가자당 4문항(도메인 4종 × why/how 2종), 조건별 절반씩, 순서 균형화.
  자연과학·생물을 한 조건, 물리·사회를 다른 조건으로 묶어 학습 전이 효과를 제한

### 6.2 측정

- **즉시 이해도**: 대화마다 3문항. 먼저 개방형으로 묻고, 못 맞히면 선택지 2개 제시.
  **선택지 없이 정답 = 2점 / 선택지 필요 = 1점 / 오답 = 0점**. 대화 속 진단 질문과 겹치지 않게 설계
- **몰입**: 코더 2인이 턴별로 기록. 시선 이탈(부정 지표), 언어적 코멘트·비언어적 코멘트(긍정 지표).
  ICC = 0.73 (substantial)
- **사용성**: Giggle gauge 4문항(즐거움), Richards & Calvert 2문항(신뢰). "예/아니오" 후
  "조금/확실히"로 4점 순서 척도

### 6.3 결과

| 측정 | DAPIE | Baseline | 유의성 |
|---|---|---|---|
| 즉시 이해도 (12점 만점) | **7.43** (SD 2.57) | 5.13 (SD 2.52) | **p<0.05** (6문항 중 1문항 더 정답) |
| 시선 이탈률 | **11.9%** | 29% | **p<0.01** |
| 언어적 코멘트 | 18.7% | 11.5% | n.s. |
| 비언어적 코멘트 | 11% | 18.36% | p<0.05 (**베이스라인이 높음**) |
| 상호작용 시간 | 7.03분 | 2.80분 | — |
| 평균 턴 수 | **20턴** | 7턴 | — |
| "또 쓰고 싶다" | 3.38 (SD 1.05) | 2.31 (SD 1.10) | p<0.05 |
| "더 좋은 선생님이다" | 3.69 (SD 0.58) | 2.75 (SD 1.15) | p<0.05 |
| "새로운 걸 배웠다" | — | — | n.s. (p=0.07) |
| 신뢰도 | — | — | n.s. (p=0.60) |

**관찰:**

- 16명 중 **15명이 조정 설명을 1회 이상** 받았고, 평균적으로 대화당 한 번은 조정 전체 흐름을 거쳤다
- 16명 중 **15명이 guiding question에서 "더 듣겠다"를 선택**했다. 대화가 3배 길어졌는데도
  건너뛰거나 무시하지 않았다
- 시선 이탈의 성격이 달랐다 — DAPIE에서는 **부모에게 자랑하거나 설명하려고** 고개를 돌렸고,
  베이스라인에서는 **흥미를 잃고** 딴 곳을 보다가 "Okay"가 뜨자마자 눌렀다
- 아이 인용: *"I can focus more to get correct answers. I'm happy when I get answers."* (C7) ·
  *"DAPIE is like my friend because words are easier than the other one so it makes me more comfortable."* (C9) ·
  *"DAPIE is more like my dad or kind teachers who explain again more easily when I couldn't understand."* (P14)
- C12는 답하고 클릭하는 **추가 노력이 부담스러울 수 있다**고 말했다
- **신뢰도만 차이가 없었던 이유가 중요하다** — 일부 아이는 베이스라인이 **더 긴 문장으로 말해서**
  더 똑똑하고 믿을 만해 보인다고 답했다

**부모 반응 (§6.4.4):**

- 아이가 더 긴 대화에 집중하는 것에 놀랐고, 그 이유를 상호작용성으로 봤다
- 과학 설명의 어려움을 토로했다 — *"My son asks me these questions quite frequently, but I
  couldn't always know the answers, so I googled the question to get information and change it in a
  way that my child could understand. This process is challenging, so sometimes I can't care about
  whether my son understands or not."* (P9)
- ⚠ **일부 부모는 AI 생성 오류를 알아채지 못했고, 애초에 AI가 만든 대화인 줄도 몰랐다**

---

## 7. 실패 모드와 한계 (§7.2, §7.4)

### 7.1 턴 간 문맥 단절 — 가장 중요한 실패 모드

턴을 **독립적으로** 생성해서 문맥을 잃는다.

- 한 문장이 앞 턴의 개체를 "these"로 지칭했는데, 파이프라인이 그걸 blank로 잡아 선택지가
  `these` / `that` / `those`가 됐다. 아이들은 선택지가 무의미한데 "these"를 안 고르면
  틀렸다고 나와서 **좌절했다**
- 중력을 설명하는 대화에서 매 턴 정답이 "gravity"인 진단 질문이 반복돼 **지루해했다**

> While these failure cases indicate that the pipeline should propagate information across turns,
> we observed that **propagating AI's outputs could lead to error propagation. Thus, to prevent
> errors from propagation, the pipeline must also incorporate modules to detect, filter and/or
> correct failed generations before they are propagated.** (§7.2)

논문의 추가 제안: 아이가 의도를 표현할 수 있는 간단한 피드백 버튼("bored", "bot was not smart")을
두어 오류 비용을 줄인다.

### 7.2 한계

- LLM은 편향(성별·인종·문화)을 보일 수 있고 파이프라인이 이를 전파·증폭할 수 있다.
  대응책으로 편향 완화 NLP 기법 적용 또는 **부모의 사전 검증**을 제안
- 전체 시스템 vs 문장 단위 베이스라인 비교라 **개별 컴포넌트의 효과를 분리할 수 없다**
- 대화 직후 평가만 했으므로 **장기 기억 효과는 알 수 없다**
- 실험 통제를 위해 **아이가 직접 질문하는 것을 허용하지 않았다**
- 참가자 풀이 인종·연령·음성비서 사용 경험에서 편향됐다

### 7.3 확장 제안 (§7.3)

- 학습 이론의 **fading**(능력에 따라 지원을 줄임)에 따라 나이 든 아이에게는 턴당 설명을 늘리거나
  덜 단순화할 수 있다
- 일부 아이를 지루하게 한 **회상형 진단 질문 대신 자기설명(self-explanation) 질문**을 쓸 수 있다
- 핵심 정보를 유지한 채 상호작용으로 감싸는 구조는 **교과서 능동 읽기 지원**으로 확장 가능하다

---

## 8. F10 키웅이 적용 매핑

구현 계약은 `web/features/f10-chatbot/SPEC-explain-4stage.draft.md`가 소유한다. 여기서는
논문의 어느 부분을 채택·변형·기각했는지만 기록한다.

| 논문 | F10 채택 | 비고 |
|---|---|---|
| 조정 사다리 (§4.2.3~4.2.5) | **채택** — 1줄 설명 → 이해 확인 → 추가 설명 → 예시 | 교육형 답변(금융 개념·종목 사실·섹터)에만 적용 |
| 빈칸/선택형 진단 질문 | **채택** | 자유응답 채점 불가 문제는 우리도 동일 |
| 조정은 main 턴 **뒤에** | **채택** | 이해한 아이의 몰입 보존 |
| Feedback 서브턴 | **채택** — 각 전이의 첫 고정 문장 | 3문장 상한에 포함 |
| 검증된 소스에서 정의 검색 | **채택** — Merriam-Webster 자리에 **승인된 용어 사전** | 할루시네이션 회피 논리 동일 |
| `elicit question` ("이 단어 알아?") | **기각** | 논문은 성인용 사전을 써서 아이를 걸러내야 했다. 우리 사전은 이미 아이 눈높이라 분기가 무의미 |
| 런타임 NLP 파이프라인 (T5·BERT·MUSS·GPT-3) | **기각** | 논문은 인터넷의 임의 롱폼 답변을 실시간 변환해야 해서 필요했다. 우리 코퍼스는 닫혀 있어(용어 32·종목 51·섹터 13) **빌드 타임 저작**으로 충분 |
| 자유 음성 입력 배제·선택지 클릭 | **채택** | 우리는 텍스트 입력을 유지하되 4단계 응답은 선택지 클릭 |
| 턴 간 문맥 전파 실패 (§7.2) | **회피** | 사전 저작·사람 검수라 대명사 blank·반복 정답 문제가 생기지 않는다 |
| 부모가 AI 오류를 못 알아챔 (§6.4.4) | **경고로 기록** | 금융 도메인에서는 위험이 더 크다. `shared/llm/filter` + 빌드 타임 게이트 검증의 근거 |

---

## 9. 추출 시 유의

- 본문 그림(Figure 1~11)은 이미지라 텍스트가 추출되지 않는다. 특히 다음 두 개는 원문 PDF를
  직접 봐야 한다.
  - **Figure 5** (10쪽): "How did people make languages?"에 대해 생성된 대화 트리 부분
  - **Figure 11** (22쪽, Appendix A): "Why do we scratch our heads when confused?"에 대한
    파이프라인 생성 대화 전체 예시 — **스크립트 저작 시 참고 가치가 가장 높다**
- few-shot 예시 전문, 데이터 수집 상세, 평가 문항 전문은 별도 Supplementary Materials에 있다.
