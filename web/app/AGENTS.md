# app/ — 라우팅·인프라

- 오케스트레이터만 수정한다.
- `page.tsx`는 `features/*` 화면을 연결만 한다. 라우트: `/`, `/stocks`, `/trade/[symbol]`, `/archive`; F10은 전 화면 오버레이다.
- `api/quote/[symbol]`은 키움 시세 프록시+폴백 캐시다.
- F9·F10 로직은 기능 폴더와 `shared/llm`에 둔다. `api/chat` Route Handler는 필터 통과 SSE 전송만 담당하고 OpenAI SDK를 직접 호출하지 않는다.
