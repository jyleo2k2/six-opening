# app/ — 라우팅·인프라

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 오케스트레이터만 수정한다.
- 현재 사용자 화면 라우트는 `/`와 iframe 차트용 `/tradingview-chart`다. `/`의 `page.tsx`는 `features/f0-home/ConnectedPrototype`만 재수출하고, 홈·탐색·상세·주문·계좌·랭킹·아카이브 화면 전환은 `public/ui/app.html` 내부 상태가 소유한다. `/stocks`·`/trade/[symbol]`·`/archive` 라우트가 있다고 가정하지 않는다.
- `api/universe`·`api/quote`·`api/news`는 정적 프로토타입이 소비하는 조회 경계다. 거래·계정·프로필·피드 API는 각 기능 `SPEC.md`에 적힌 현재 프론트 연결 상태를 확인한 뒤 수정한다.
- `api/quote/[symbol]`은 키움 시세 프록시+폴백 캐시다. 수정 전 `web/features/f2-trade/SPEC.md`를 읽는다.
- F9·F10 로직은 기능 폴더와 `shared/llm`에 둔다. `api/chat`을 수정할 때는 `web/features/f10-chatbot/SPEC.md`를 읽으며, Route Handler는 검증·필터 통과 SSE 전송만 담당하고 OpenAI SDK를 직접 호출하지 않는다.
