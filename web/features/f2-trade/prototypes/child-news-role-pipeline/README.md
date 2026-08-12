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

## 실행

```powershell
cd web
npx tsx features/f2-trade/prototypes/child-news-role-pipeline/pipeline.test.ts
npm run build
```

## 운영 연결 전 남은 일

1. 실제 최신 기사 10건으로 역할 결과 재검증
2. 일일 수집기와 이 프로토타입 입력 계약 연결
3. 별도 Supabase 프로젝트의 테이블·멱등 upsert 연결
4. 스케줄 재실행·부분 실패·관측 로그 검증

이 조건이 끝나기 전에는 `ready_for_storage`를 실제 DB insert와 동일하게 취급하지 않는다.
