# shared/ — 공용 계약

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 오케스트레이터만 수정하고 기능 폴더는 import만 한다.
- 거래·질문 기록 계약은 `web/features/f2-trade/SPEC.md`, 성향 엔진 계약은 `web/features/f9-archive/SPEC.md`, 챗봇 데이터·LLM·선제 신호 계약은 `web/features/f10-chatbot/SPEC.md`를 관련 변경일 때만 읽는다.
- `engine`은 LLM·부수효과 없이 `types`만 import한다. `llm`은 서버 전용 `openai` Responses API와 모델 상수 `gpt-5.6-luna`를 소유하며 모든 출력을 `llm/filter`에 통과시킨다.
- F10은 `responses.create({ stream: true })`의 `response.output_text.delta`를 문장 단위로 버퍼링해 필터 통과분만 내보내고, F9은 비스트리밍 `responses.create`로 서술만 생성한다.
- 공용 변경은 오케스트레이터에게 요청한다. 임시 타입·컴포넌트 복제 금지.
- 엔진 지표마다 최소 1개 테스트를 둔다.
