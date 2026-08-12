# 자녀용 뉴스 — 다음 세션 인수인계 (2026-08-11 작성)

## 지금 하는 일

F2 종목 상세 화면의 **"요즘 무슨 일이 있었어?"** 뉴스 브리핑을 만든다.
기획 근거는 통합문서 v2 §10 "종목별 아이 눈높이 설명 수작성"과 기능명세 F2다.
챗봇(F10)과 별개 기능이다. 혼동하지 말 것.

화면은 두 개다.

1. **홈 카드**: 제목 "요즘 무슨 일이 있었어?" + 2문장 요약 + "뉴스 자세히 보기" 버튼
2. **상세(한 화면)**: 카테고리 칩 → 헤드라인 → **본문 3문단** → **기억할 점 세 가지** →
   키웅이 면책 말풍선(고정 문구, 생성 금지) → "사볼래! (매수)" 버튼(UI 소유)

본문 3문단의 역할은 고정이다.

| 문단 | role | 내용 |
|---|---|---|
| 1 | `what_happened` | 무슨 일이 있었는지 + 어려운 용어 풀이 |
| 2 | `business_link` | 그래서 어디로 이어졌는지 |
| 3 | `unknown` | 아직 모르는 점. **"다만"으로 시작** |

## 라운드 1 결과 (완료)

- 실행일 2026-08-11. 입력: 네이버 뉴스 10건, **전부 기사 본문 수집 성공**(1,082~3,100자).
  경제 3 / 섹터 3 / 종목 4. 종목은 유니버스 51종 안에서만 선정.
- 6개 설정 전부 10/10 생성. 검증은 terra_medium만 1건 실패(홈요약 53자 > 50자 상한).
- 보고서: `docs/어린이뉴스_한화면_벤치마크_2026-08-11.md` (10기사 × 6설정 전문) — 2026-08-12 `records/`에서 이동

| 라벨 | 용어 풀이 | 판정 |
|---|---:|---|
| **sol_xhigh** | **2/10** | 잠정 1순위 |
| terra_xhigh | 1/10 | 라운드 2 대상 |
| luna_max | 0/10 | 라운드 2 대상 |
| sol_low · terra_medium · luna_medium | 0/10 | **탈락** — 요약만 하고 번역을 안 한다 |

**안전성으로는 변별되지 않았다.** 스트레스 기사 2건(03 상한가·투자360, 10 평가 논조 칼럼)에서
6개 전부 투자 표현·훈계를 걸러냈다. 금지 표현 정규식도 전원 통과.

**변별은 용어 풀이 한 군데서만 났다.** 같은 03번 기사에서:

- sol_xhigh: "가격제한폭은 하루에 오를 수 있는 한도야" / "사업에서 손실" / "상장 유지 기준을 못 맞출 수 있다는 알림"
- 나머지: "가격제한폭까지 오른 11곳" / "영업적자" / "관리종목 지정 우려 공시" (원문 단어 그대로)

**추론 강도가 가른다. 모델 계열이 아니다.**

## 라운드 2에서 할 일

### 1. 계약을 먼저 고친다 (이게 핵심)

`.claude/skills/child-news-renderer/references/one-screen-contract.md`의 "말투" 절에서:

```
현재: - 어려운 말은 최대 1개만 쓰고, 쓴 자리에서 바로 풀어 준다.
수정: - 첫 문단에는 이 뉴스를 이해하는 데 꼭 필요한 용어를 하나 골라 반드시 풀어 준다.
       아이가 모를 말을 풀지 않고 지나가면 실패다.
       예: "반도체는 컴퓨터의 뇌랑 기억을 맡는 부품이야."
```

라운드 1에서 모델들이 "최대 1개만"을 *어려운 말을 쓰지 마라*로 읽어 용어를 피하고
숫자만 나열했다. 허용이 아니라 **의무**로 바꿔야 한다.

### 2. 같은 입력으로 3개만 재실행

**뉴스를 다시 수집하지 마라.** 라운드 1과 비교하려면 입력이 같아야 한다.
`_workspace/benchmark_20260811/sources/01.json~10.json`을 그대로 쓴다.

출력은 새 폴더에 넣는다: `_workspace/benchmark_20260811/outputs_r2/{label}/`

```
codex exec -m gpt-5.6-sol   -c model_reasoning_effort="xhigh"  -s workspace-write "<ASCII 지시>"
codex exec -m gpt-5.6-terra -c model_reasoning_effort="xhigh"  -s workspace-write "<ASCII 지시>"
codex exec -m gpt-5.6-luna  -c model_reasoning_effort="max"    -s workspace-write "<ASCII 지시>"
```

`run_in_background: true`로 3개 동시 실행. 5~10분 걸린다.

### 3. 비교

```
node .claude/skills/child-news-benchmark/scripts/compare-one-screen.mjs --base <workspace> --mode stats
node .claude/skills/child-news-benchmark/scripts/compare-one-screen.mjs --base <workspace> --mode diff --articles 03,04,10
node .claude/skills/child-news-benchmark/scripts/build-one-screen-report.mjs --base <workspace> --output <보고서.md>
```

용어 풀이가 라운드 1의 2/10에서 몇으로 오르는지가 판정 기준이다.

## 이미 만들어 둔 것 (다시 만들지 말 것)

| 파일 | 역할 |
|---|---|
| `.claude/skills/child-news-renderer/references/one-screen-contract.md` | **새 출력 계약.** 기존 `output-contract.md`(3카드·퀴즈·가족질문)는 이 기능에 쓰지 않는다 |
| `.claude/skills/child-news-compare/scripts/validate-one-screen.mjs` | 새 검증기. 글자수·문단 역할 순서·"다만" 시작·source_ids 실재·금지 표현 |
| `.claude/skills/child-news-benchmark/scripts/shortlist-candidates.mjs` | 유니버스 51종 기반 버킷 분류 + 품질 점수 |
| `.claude/skills/child-news-benchmark/scripts/prepare-fulltext-packets.mjs` | 기사 본문 수집 + 패킷 생성 (네이버 밖 언론사도 처리) |
| `.claude/skills/child-news-benchmark/scripts/compare-one-screen.mjs` | 집계·기사별 비교 |
| `.claude/skills/child-news-benchmark/scripts/build-one-screen-report.mjs` | 마크다운 보고서 생성 |
| `_workspace/benchmark_20260811/WORKER-INSTRUCTIONS.md` | 워커 지시서 (UTF-8) |

## 함정

- **codex에 한글 프롬프트를 인자로 넘기면 인코딩이 깨진다.** 지시는 UTF-8 파일에 쓰고
  codex에는 ASCII 한 줄만 넘긴다: `Read <절대경로> and follow it exactly. Your output label is X. Write results to <절대경로>\`
- **`Agent` 툴로는 `gpt-5.6-*`를 못 돌린다.** 모델 인자가 sonnet/opus/haiku/fable만 받는다.
  이 벤치마크의 서브에이전트는 반드시 codex CLI다.
- PowerShell `Get-Content`/`ConvertFrom-Json`으로 한글 JSON을 읽으면 깨진다. `node -e`를 써라.
- `codex` 0.146.1 이상 필요. 구버전은 luna를 400으로 거부한다.

## 아직 정하지 않은 것

1. **라운드 2 실행 승인** — 유저가 보고서를 직접 보고 판정하겠다고 했다. 아직 승인 없음.
2. **블라인드 패킷** — 라벨을 A~F로 익명화해 유저가 편향 없이 볼지. 물어봤으나 답 없음.
3. **모델 상수 자리** — 뉴스용 모델이 챗봇(Luna)과 다르면 `기술스택.md`가 "F9·F10 모두 Luna 단일화"로
   못 박혀 있어 세 번째 경로를 추가해야 한다. 역할별 상수 `NEWS_MODEL`이 여기서 필요해진다.
4. **프롬프트 착지점** — `web/features/f2-trade/lib/news-prompt.ts`가 맞다.
   병합 대기 블로커는 해소됐다(PR #11로 F2 코드가 루트 `mock-stock/` 폴더로 들어옴).
   남은 결정은 `web/features/f2-trade/`와 `mock-stock/features/f2-trade/` 중 어디에 둘지다.
5. **본문 수집의 제품화** — 이번엔 벤치마크용으로 로컬 수집만 했다.
   실서비스에서 기사 본문을 어떻게 확보할지(제휴·API·요약 패시지 한정)는 미결정.
