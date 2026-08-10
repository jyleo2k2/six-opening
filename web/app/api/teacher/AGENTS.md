# app/api/teacher — [폐기] (2026-08-10)

- **이 폴더는 폐기됐다.** F7 AI 선생님 기능이 핵심기능 개편(기획서 v5)으로 삭제되고 F8 가족 AI펫으로 대체됨 — 펫은 자유 입력이 없어 실시간 대화·음성 파이프라인이 필요 없다.
- 남아 있는 route.ts들(session/speech/knowledge/filter)은 GPT Realtime 실험 코드 — **신규 작업·참조·수정 금지, 삭제 대기.**
- 재사용 가치가 있는 유일한 조각: `shared/llm/filter` 연동 패턴과 knowledge 검색 구조(승인 자료 한정 원칙) — 필요하면 f8-pet server action에서 새로 구현할 것.
