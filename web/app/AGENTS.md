# app/ — 라우팅·인프라

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 오케스트레이터만 수정한다.
- `page.tsx`는 `features/*` 화면을 연결만 한다. 라우트: `/`, `/stocks`, `/trade/[symbol]`, `/archive`; F10은 전 화면 오버레이다.
- `api/quote/[symbol]`은 키움 시세 프록시+폴백 캐시다. 수정 전 `web/features/f2-trade/SPEC.md`를 읽는다.
- F9·F10 로직은 기능 폴더와 `shared/llm`에 둔다. `api/chat`을 수정할 때는 `web/features/f10-chatbot/SPEC.md`를 읽으며, Route Handler는 검증·필터 통과 SSE 전송만 담당하고 OpenAI SDK를 직접 호출하지 않는다.
