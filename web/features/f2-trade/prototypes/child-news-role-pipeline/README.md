# 어린이 뉴스 역할 파이프라인 프로토타입

> 상태: **프로토타입** — 수동 검증을 통과한 결과만 Supabase에 넣을 수 있으며, 일일 수집 스케줄에는 아직 연결하지 않는다.

오늘 국내 시황 또는 선정 51개 기업의 직접적인 중요 사건만 골라, 10~13세가 읽을 수 있는 뉴스 후보로 바꾸고 독립 검수하는 실험 구현이다.

## 처리 흐름

```text
원문 후보
  → 제목 1차 선별자(max, 정책 교정 제목 예시 제공)
  → 통과 후보만 본문 관련성 선별자(max)
  → 선별 문장만 어린이 편집자에게 전달(high, 필요 시 high 1회)
  → 결정적 근거·숫자·용어·안전 게이트
  → 원문과 노출문만 보는 독립 출고 검수자(max)
  → ready_for_storage 또는 rejected
```

- 제목 단계의 `pass`는 저장 승인이 아니라 본문을 읽어 볼 후보라는 뜻이다. 제목만으로 명백한 채용·행사·사회공헌·홍보·미확정 경쟁·주체 불일치일 때만 `reject`한다.
- 제목 선별자는 평가 10건과 겹치지 않는 `headline-screening-examples.ts`의 정책 교정용 통과·거부 예시를 함께 받는다. 이 예시 목록은 대표님 검수 전 초안이다.
- 편집자는 원문 전체를 받지 않아 코스닥 동향·개발자 강연 같은 주변 사실을 되살릴 수 없다.
- 채용·행사·사회공헌·사내 혁신·일반 홍보와 선정 기업이 고객·제공 채널로만 등장한 기사는 탈락한다.
- 서비스 상세 본문은 서로 다른 정보를 담은 정확히 3줄 요약이며 각 줄은 최대 36자다. 같은 사실을 넓은 설명과 숫자 설명으로 반복해도 재편집 후 탈락한다.
- 어려운 용어는 하나만 고르지 않고 선별 문장에 남은 항목을 모두 `replaced` 또는 `explained`로 처리한다.
- 코스피는 일반 표현으로 없애지 않고 이름을 그대로 쓴 뒤, 국내 주식시장을 대표하는 숫자라고 실제 노출문에서 설명한다.
- `%`, 억원, 조원, 1~4분기 표기는 그 자체만으로 어려운 용어로 잡지 않고 원문 숫자와 일치하는지만 확인한다.
- 한 단계라도 파싱 오류·시간 초과·판단 불일치가 나면 저장 후보가 되지 않는다.

## 파일

- `pipeline.ts`: 문장 분리, 제목 선별과 3역할 오케스트레이션, 결정적 게이트, 닫힌 실패
- `contracts.ts`: 역할 입출력 계약과 런타임 파서
- `prompts.ts`: 역할별 프롬프트
- `headline-screening-examples.ts`: 평가 입력과 겹치지 않는 정책 교정용 제목 판단 예시
- `server.ts`: 서버 전용 OpenAI Responses API 실행기 진입점
- `pipeline.test.ts`: 초점 이탈·일상 기사·용어 누락·검수 실패 회귀 테스트
- `evaluation.ts`: 10건 기준표 대조, JSON 보고서 계약, 정적 HTML 렌더러
- `run-evaluation.ts`: Luna 단일 모델로 고정 입력 10건을 실행하는 서버 전용 CLI
- `run-evaluation.cjs`: 일반 Node 실행에서 Next의 `server-only` 경계를 유지하는 부트스트랩
- `evaluation-fixtures/latest-economic-news-2026-08-12.json`: 최신 기사 후보에서 고정한 사람 기준표와 출처 사실 단위
- `evaluation-fixtures/latest-economic-news-2026-08-13.json`: 앞선 표본과 URL이 겹치지 않는 두 번째 최신 기사 10건 기준표
- `evaluation.test.ts`: 평가 판정·10건 제한·HTML 이스케이프 회귀 테스트
- `naver-news-collector.ts`: 네이버 검색에서는 후보 URL만 찾고 실제 기사 페이지에서 제목·시각·언론사 원문 URL·본문 근거를 읽는 51종목 수집기
- `collect-universe-news.ts`: 종목마다 체크포인트를 남기고 `--resume`할 수 있는 51종목 수집 CLI
- `universe-news-evaluation.ts`: 51종목 결과 계약, 대상 종목 주인공 게이트, 현재 목업 대 실제 결과 비교 HTML
- `run-universe-evaluation.ts`: 51종목을 Luna 역할 파이프라인으로 판정하고 종목마다 JSON·HTML을 갱신하는 CLI
- `universe-news-storage.ts`: 완전한 51종목 보고서에서 기술 오류가 없을 때 통과 기사만 동일 `article_id`·인용 근거로 묶는 SQL 생성기

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
node features/f2-trade/prototypes/child-news-role-pipeline/run-evaluation.cjs
```

기본 출력은 `reports/latest-economic-news-2026-08-12-luna/`의 `report.json`과 `index.html`이다. 같은 경로가 있으면 덮어쓰지 않으며 재실행은 `--overwrite`를 명시한다. HTML 첫 화면에는 `ready_for_storage` 기사의 제목과 겹치지 않는 3줄 요약을 실제 서비스 뉴스 카드 형태로만 보여준다. 홈 화면 전용 요약을 상세 카드에 다시 노출하지 않는다. `원문 보기`는 새 창 팝업을 만들지 않고 같은 탭에서 출처 URL로 이동한다. 원문 근거 문장과 제목 선별·본문 선별·1~2차 편집·독립 검수의 실제 JSON, 거부 기사 판정은 아래 `검수 상세 보기`를 펼쳐 확인한다. 프로세스는 다음을 기사별로 남긴다.

- 오늘 국내 시황 또는 선정 51개 기업의 직접 사건인지
- 채용·행사·사회공헌·일반 홍보인지
- 원문과 노출문의 주인공이 같은지
- 코스닥·다른 회사·주변 사실을 섞었는지
- 세 줄이 각각 36자 이하이며 같은 사실을 반복하지 않는지
- 선별 문장에 남은 어려운 용어를 모두 처리했는지
- 숫자·날짜·주장 주체가 출처와 같은지
- `ready_for_storage` 또는 단계·코드·설명이 있는 `rejected`인지

사람 기준표의 기대 상태·허용 reject 코드와 실제 결과가 다르거나, 저장 판정에 구체적인 근거가 없으면 CLI는 JSON·HTML을 남긴 뒤 실패 종료한다. 탈락 단계 뒤의 기준은 실패로 꾸미지 않고 `not_applicable`로 표시한다.

10건 평가 실행은 max 추론 역할의 응답 시간을 확인할 수 있도록 역할당 180초를 허용한다. 시간 안에 응답하지 않으면 기존과 같이 해당 기사를 `ROLE_ERROR`로 닫힌 실패 처리한다. 운영 파이프라인의 기본 제한은 바꾸지 않는다.

이 평가는 모델 간 A/B가 아니다. 모든 역할은 `web/shared/llm`의 `gpt-5.6-luna`와 서버 전용 Responses API를 사용하고, 역할별 입력 격리와 결정적 게이트의 실제 품질을 검증한다.

## 51종목 수집·파이프라인·목업 비교

51종목 각각에 대해 최신순 검색 후보를 최대 3페이지에서 찾고 표준 기사 페이지를 다시 읽는다. 검색 결과의 짧은 설명은 근거로 사용하지 않는다. 종목명이 제목 또는 실제 본문에 없는 후보는 수집 단계에서 제외하고, 실적·계약·생산 같은 직접 사건을 우선하되 적절한 후보가 없으면 일상·홍보·주인공 불일치 후보를 억지로 통과시키지 않는다.

```powershell
cd web

# 51종목 실제 기사 후보 수집. 종목마다 같은 JSON에 체크포인트를 쓴다.
node features/f2-trade/prototypes/child-news-role-pipeline/collect-universe-news.cjs `
  --date 2026-08-13 `
  --run-id selected-company-news-2026-08-13-luna `
  --overwrite

# 중단된 수집 재개
node features/f2-trade/prototypes/child-news-role-pipeline/collect-universe-news.cjs `
  --date 2026-08-13 `
  --run-id selected-company-news-2026-08-13-luna `
  --resume

# 51종목 Luna 판정과 현재 목업 대 실제 결과 비교 HTML 생성
node features/f2-trade/prototypes/child-news-role-pipeline/run-universe-evaluation.cjs `
  --input features/f2-trade/prototypes/child-news-role-pipeline/evaluation-fixtures/selected-company-news-2026-08-13-luna.json `
  --output features/f2-trade/prototypes/child-news-role-pipeline/reports/selected-company-news-2026-08-13-luna `
  --overwrite

# 중단된 모델 판정 재개
node features/f2-trade/prototypes/child-news-role-pipeline/run-universe-evaluation.cjs `
  --input features/f2-trade/prototypes/child-news-role-pipeline/evaluation-fixtures/selected-company-news-2026-08-13-luna.json `
  --output features/f2-trade/prototypes/child-news-role-pipeline/reports/selected-company-news-2026-08-13-luna `
  --resume

# 완료 보고서에서 ROLE_ERROR·PIPELINE_EXECUTION_ERROR 종목만 다시 실행
node features/f2-trade/prototypes/child-news-role-pipeline/run-universe-evaluation.cjs `
  --input features/f2-trade/prototypes/child-news-role-pipeline/evaluation-fixtures/selected-company-news-2026-08-13-luna.json `
  --output features/f2-trade/prototypes/child-news-role-pipeline/reports/selected-company-news-2026-08-13-luna `
  --resume `
  --retry-technical-errors `
  --role-timeout-ms 600000

# 51건 완료·기술 오류 0건일 때만 통과 기사 적재 SQL 생성
node features/f2-trade/prototypes/child-news-role-pipeline/generate-universe-storage.cjs `
  --report features/f2-trade/prototypes/child-news-role-pipeline/reports/selected-company-news-2026-08-13-luna/report.json `
  --overwrite
```

비교 HTML은 종목마다 왼쪽에 현재 `universe.js`의 업종 공통 짧은 카드·상세 목업을, 오른쪽에 실제 파이프라인 결과를 둔다. 통과 기사는 짧은 카드와 자세히 보기가 같은 파이프라인 결과를 쓰고, 거부 기사는 `서비스 카드 없음`과 단계·코드·설명을 보여준다. 종목명·제목 검색, 통과·거부, 업종 필터를 제공하며 원문 보기는 실제 언론사 URL을 새 탭으로 연다.

51종목 실행에서 제목·본문 선별과 독립 검수는 `max`, 편집은 `high`를 유지한다. 추론 토큰이 보이는 JSON 출력 전에 한도를 모두 쓰는 문제를 막기 위해 역할별 출력 여유를 32,000~48,000으로 두고 `max_output_tokens` 불완전 응답일 때만 64,000으로 한 번 재시도한다. 역할당 기본 제한은 360초이며 기술 오류 재시도 때는 `--role-timeout-ms`로 최대 900초까지 명시할 수 있다. 최종 보고서에 `ROLE_ERROR`나 `PIPELINE_EXECUTION_ERROR`가 하나라도 있으면 적재 SQL 생성 자체를 막는다.

DB에는 `ready_for_storage` 결과만 넣는다. `report.json`은 51건의 통과·거부 감사 기록을 모두 보존하지만, 거부 기사를 서비스 카드로 만들지 않는다. SQL은 원문 URL의 SHA-256을 `source_key`, 원문 근거 배열의 SHA-256을 `evidence_hash`로 사용하고, 같은 원문이 다른 근거·다른 요약으로 중복 통과하면 저장 전에 실패한다.

### 2026-08-13 제목 선별·3줄 요약 추가 후 실측 결과

`reports/latest-economic-news-2026-08-12-luna/`에 실제 Luna 실행 결과를 보존했다.

- 사람 기준표 일치: **9/10**
- 제목 단계의 저장 대상 오거부: **0건**
- 제목 단계: 본문 검토 후보 **5건**, 명백한 제외 **5건**
- `ready_for_storage`: **3건**
- `rejected`: **7건**
- 전체 판정: **실패** (`criteriaPassed: false`)
- 코스피 기사 실제 3줄: `12일 오전 코스피 6500선이 회복됐다.` / `삼성전자 주식값은 약 4%, SK하이닉스는 약 2% 올랐다.` / `코스피는 국내 주식시장을 대표하는 숫자야.`
- 통과 기사 3건은 모두 정확히 3줄이며 각 줄은 36자 이하다.
- 불일치: 아시아나항공 합병 기사 편집자가 두 번의 시도에서도 선별된 어려운 용어 전체를 실제 3줄에 처리하지 못해 `UNEXPLAINED_TERM`으로 차단

제목 선별 자체는 사람 기준표상 저장 대상 네 건을 모두 본문으로 넘겼다. 전체 파이프라인은 그중 한 건의 전 용어 처리가 실패했으므로 실제 저장을 허용하지 않는다. 모델 출력 원본과 재시도 결과는 JSON의 `roleAttempts`와 상세 HTML에서 확인할 수 있으며, Supabase 저장과 일일 수집기 연결은 후속 검증이 통과할 때까지 보류한다.

### 2026-08-13 다른 기사 10건 재검증

앞선 표본과 출처 URL이 겹치지 않는 당일 기사 10건을 아래 명령으로 실행했고, 결과는 `reports/latest-economic-news-2026-08-13-luna/`에 보존했다.

```powershell
cd web
node features/f2-trade/prototypes/child-news-role-pipeline/run-evaluation.cjs --input features/f2-trade/prototypes/child-news-role-pipeline/evaluation-fixtures/latest-economic-news-2026-08-13.json
```

- 사람 기준표 일치: **8/10**
- `ready_for_storage`: **3건** — 코스피 마감, 한국전력 실적, 백화점 3사 비교 중 신세계 실적
- `rejected`: **7건**
- 전체 판정: **실패** (`criteriaPassed: false`)
- 코스피 기사 실제 3줄: `13일 코스피가 올라 마감했다.` / `다른 국내 주식시장 숫자도 0.29% 올랐다.` / `코스피는 국내 주식시장 대표 숫자야.`
- 삼성전자 푸네 생산라인 기사는 통과 대상이지만 편집 응답이 출력 토큰 한도에서 비어 `ROLE_ERROR`로 닫힌 실패했다.
- 백화점 3사 비교 기사는 사람 기준표에서 주인공 불일치로 거부했지만, 모델은 신세계 사실 단위만 골라 최종 통과시켰다. 기사 일부를 한 회사 뉴스로 분리해도 되는지는 대표님 검수 결정이 필요하다.
- LG와 LG전자, 삼성생명과 삼성전자, 현대차 정몽구 재단과 현대차를 구분했고, 네이버·음악 홍보·포럼·정유사 합산 기사는 모두 거부했다.
- 서비스 카드의 `원문 보기`는 정확한 출처 `href`를 유지하고 `target="_blank"`를 제거하는 회귀 테스트를 통과했다.

이 10건 역사적 실행에서는 실제 서비스 저장 연결을 하지 않았다. 이후 51종목 실행은 51건 완료·기술 오류 0건을 별도 조건으로 두고, 그 실행에서 통과한 기사만 수동 적재한다.

## 주가와 연결해 쉽게 읽는 골든 뉴스 10건

기존 목업과 자유 요약 결과를 바로 운영 계약으로 쓰지 않고, 먼저 사람이 문안 방향을 검수할 수 있는 골든 10건을 만든다. 실적 외에도 생산설비, 합병, 부분파업, 배당, 해외 렌탈 성장, 최대주주 변경, 실제 주가 움직임과 시장 시황을 포함한다.

```powershell
cd web
npx tsx features/f2-trade/prototypes/child-news-role-pipeline/price-linked-news.test.ts
npx tsx features/f2-trade/prototypes/child-news-role-pipeline/generate-price-linked-review.ts
```

출력은 `reports/price-linked-news-golden-2026-08-13/`에 JSON과 HTML로 생성된다.

- 종목 화면과 상세 화면은 같은 `headline`을 사용한다.
- 상세의 세 줄은 서로 다른 `factKey`와 원문 근거 ID를 가져야 하며 제목 문장을 그대로 반복하지 않는다.
- `%`, `억 원`, `조 원`은 그대로 두고 금융용어는 없애지 않은 채 별도 설명한다.
- `왜 주가와 관련 있어?`는 기사에서 확인된 연결과 사건 유형에 따른 교육 설명을 구분한다.
- 코스피 시장 뉴스는 개별 종목의 빈자리를 채우는 폴백으로 쓰지 않는다.
- 입찰 참여처럼 계약이 확정되지 않은 사건은 중요해 보여도 서비스 카드를 만들지 않는다.
- 이 골든 문안이 사람 검수를 통과하기 전에는 기존 AI 프롬프트·DB 적재 계약에 연결하지 않는다.

## 운영 연결 전 남은 일

1. 51종목 비교 HTML 사람 검수와 통과·거부 이견 해결
2. 일일 수집기와 이 프로토타입 입력 계약 연결
3. 스케줄 재실행·부분 실패·관측 로그 검증

51종목 수동 실행과 DB 적재는 일일 수집기 연결 승인으로 간주하지 않는다.
