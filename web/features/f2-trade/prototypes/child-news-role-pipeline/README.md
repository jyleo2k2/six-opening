# 어린이 뉴스 역할 파이프라인 프로토타입

> 상태: **프로토타입** — 뉴스 수집 스케줄과 Supabase 저장에는 아직 연결하지 않는다.

오늘 국내 시황 또는 선정 51개 기업의 직접적인 중요 사건만 골라, 10~13세가 읽을 수 있는 뉴스 후보로 바꾸고 독립 검수하는 실험 구현이다.

## 처리 흐름

```text
원문 후보
  → 관련성 선별자(high)
  → 선별 문장만 어린이 편집자에게 전달(medium, 필요 시 high 1회)
  → 결정적 근거·숫자·용어·안전 게이트
  → 원문과 노출문만 보는 독립 출고 검수자(high)
  → ready_for_storage 또는 rejected
```

- 편집자는 원문 전체를 받지 않아 코스닥 동향·개발자 강연 같은 주변 사실을 되살릴 수 없다.
- 채용·행사·사회공헌·사내 혁신·일반 홍보와 선정 기업이 고객·제공 채널로만 등장한 기사는 탈락한다.
- 어려운 용어는 하나만 고르지 않고 선별 문장에 남은 항목을 모두 `replaced` 또는 `explained`로 처리한다.
- 한 단계라도 파싱 오류·시간 초과·판단 불일치가 나면 저장 후보가 되지 않는다.

## 파일

- `pipeline.ts`: 문장 분리, 3역할 오케스트레이션, 결정적 게이트, 닫힌 실패
- `contracts.ts`: 역할 입출력 계약과 런타임 파서
- `prompts.ts`: 역할별 프롬프트
- `server.ts`: 서버 전용 OpenAI Responses API 실행기 진입점
- `pipeline.test.ts`: 초점 이탈·일상 기사·용어 누락·검수 실패 회귀 테스트
- `evaluation.ts`: 10건 기준표 대조, JSON 보고서 계약, 정적 HTML 렌더러
- `run-evaluation.ts`: Luna 단일 모델로 고정 입력 10건을 실행하는 서버 전용 CLI
- `run-evaluation.cjs`: 일반 Node 실행에서 Next의 `server-only` 경계를 유지하는 부트스트랩
- `evaluation-fixtures/latest-economic-news-2026-08-12.json`: 최신 기사 후보에서 고정한 사람 기준표와 출처 사실 단위
- `evaluation.test.ts`: 평가 판정·10건 제한·HTML 이스케이프 회귀 테스트

## 실행

```powershell
cd web
npx tsx features/f2-trade/prototypes/child-news-role-pipeline/pipeline.test.ts
npx tsx features/f2-trade/prototypes/child-news-role-pipeline/evaluation.test.ts
npm run build
```

## 최신 기사 10건 품질 평가

2026-08-12 10:33 KST에 수집한 최신 경제뉴스 후보에서 당일 시황, 직접 회사 사건, 채용·행사·사회공헌·홍보, 제공 채널 오인, 미확정 수주 경쟁이 함께 들어가도록 10건을 고정했다. 원문을 길게 복제하지 않고 제목·출처 URL과 검증에 필요한 사실 단위만 입력에 둔다.

```powershell
cd web
node --conditions=react-server --import tsx features/f2-trade/prototypes/child-news-role-pipeline/run-evaluation.cjs
```

기본 출력은 `reports/latest-economic-news-2026-08-12-luna/`의 `report.json`과 `index.html`이다. 같은 경로가 있으면 덮어쓰지 않으며 재실행은 `--overwrite`를 명시한다. 프로세스는 다음을 기사별로 남긴다.

- 오늘 국내 시황 또는 선정 51개 기업의 직접 사건인지
- 채용·행사·사회공헌·일반 홍보인지
- 원문과 노출문의 주인공이 같은지
- 코스닥·다른 회사·주변 사실을 섞었는지
- 선별 문장에 남은 어려운 용어를 모두 처리했는지
- 숫자·날짜·주장 주체가 출처와 같은지
- `ready_for_storage` 또는 단계·코드·설명이 있는 `rejected`인지

사람 기준표의 기대 상태·허용 reject 코드와 실제 결과가 다르거나, 저장 판정에 구체적인 근거가 없으면 CLI는 JSON·HTML을 남긴 뒤 실패 종료한다. 탈락 단계 뒤의 기준은 실패로 꾸미지 않고 `not_applicable`로 표시한다.

이 평가는 모델 간 A/B가 아니다. 모든 역할은 `web/shared/llm`의 `gpt-5.6-luna`와 서버 전용 Responses API를 사용하고, 역할별 입력 격리와 결정적 게이트의 실제 품질을 검증한다.

### 2026-08-13 실측 결과

`reports/latest-economic-news-2026-08-12-luna/`에 실제 Luna 실행 결과를 보존했다.

- 사람 기준표 일치: **8/10**
- `ready_for_storage`: **2건**
- `rejected`: **8건**
- 전체 판정: **실패** (`criteriaPassed: false`)
- 불일치: 당일 시황의 용어 처리 라벨 오류, GS 실적의 영업이익·큰 숫자 단위 설명 부족

따라서 이 결과만으로 실제 저장을 허용하지 않는다. 모델 출력 원본과 재시도 결과는 JSON의 `roleAttempts`에서 확인할 수 있으며, Supabase 저장과 일일 수집기 연결은 후속 검증이 통과할 때까지 보류한다.

## 운영 연결 전 남은 일

1. 최신 기사 10건 평가에서 사람 기준표와 역할 결과 일치 확인
2. 일일 수집기와 이 프로토타입 입력 계약 연결
3. 별도 Supabase 프로젝트의 테이블·멱등 upsert 연결
4. 스케줄 재실행·부분 실패·관측 로그 검증

이 조건이 끝나기 전에는 `ready_for_storage`를 실제 DB insert와 동일하게 취급하지 않는다.
