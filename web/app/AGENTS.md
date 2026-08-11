# app/ — 라우팅·인프라

- 오케스트레이터만 수정한다.
- `page.tsx`는 `features/*` 화면을 연결만 한다. 라우트: `/`, `/stocks`, `/trade/[symbol]`, `/archive`; F10은 전 화면 오버레이다.
- `api/quote/[symbol]`은 키움 시세 프록시+폴백 캐시다.
- F9·F10 로직은 기능 폴더와 `shared/llm`에 둔다. API route가 필요하면 전송만 담당한다.
