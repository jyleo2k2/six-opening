# app/ — 라우팅·인프라

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 오케스트레이터만 수정한다.
- 사용자 화면은 캐치올 `[[...screen]]`이 받는다. 아는 주소는 `features/f0-home/screen-route.ts`의 `routeFromPath`가 정하고 모르는 주소는 404다. 그 밖의 라우트는 iframe 차트용 `/tradingview-chart`와 `api/*`뿐이다. `/stocks`·`/trade/[symbol]` 라우트가 있다고 가정하지 않는다.
- `[[...screen]]/page.tsx`는 서버에서 `kw_uid` 세션 쿠키(`api/supabase.ts`의 `findProfileById`)를 확인해, 로그인 상태가 아니면 `LoginGate`(스플래시+로그인, 가입은 준비 중 화면)를 렌더링한다. 로그인 뒤 화면은 **전부 React**(`features/f0-home`)이고 주소가 곧 화면이다 — iframe(`public/ui/app.html`)과 그 내부 상태는 철거했다.
- **로그인에 성공하면 곧바로 앱 화면으로 넘기지 않고 `LoadingScreen`을 세운다.** 그 화면이 진행 막대를 돌리는 동안 홈·아카이브가 읽을 것을 `features/f0-home/lib/prefetch-boot.ts`로 미리 받아 두고, 다 받으면 그때 `router.refresh()`를 부른다 — 기다림을 없앨 수 없으면 한 군데로 모은다. 여기서 새 저장소를 만들지 않는다: 응답은 각 훅의 기존 모듈 캐시에 담기고 `router.refresh()`는 문서를 새로 받지 않으므로 그대로 살아 넘어간다.
- `api/universe`·`api/quote`·`api/news`는 화면이 소비하는 조회 경계다. 거래·계정·프로필·피드 API는 각 기능 `SPEC.md`에 적힌 현재 프론트 연결 상태를 확인한 뒤 수정한다.
- `api/quote/[symbol]`은 키움 시세 프록시+폴백 캐시다. 수정 전 `web/features/f2-trade/SPEC.md`를 읽는다.
- F9·F10 로직은 기능 폴더와 `shared/llm`에 둔다. `api/chat`을 수정할 때는 `web/features/f10-chatbot/SPEC.md`를 읽으며, Route Handler는 검증·필터 통과 SSE 전송만 담당하고 OpenAI SDK를 직접 호출하지 않는다.
