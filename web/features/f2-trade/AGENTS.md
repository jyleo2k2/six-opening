# f2-trade — 모의투자

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- F2·F3 단일 스펙은 `web/features/f2-trade/SPEC.md`다. 현재 탐색·상세·매수·매도·질문식 기록 화면은 **`web/features/f0-home`의 React 컴포넌트가 소유하고**(`ExploreScreen`·`DetailScreen`·`OrderScreen`과 `lib/`의 계산 함수), 이 폴더는 TradingView 차트·차트 변환·예약 주문 계산·뉴스 공개 계약과 뉴스 파이프라인 프로토타입을 소유한다.
- **iframe(`public/ui/app.html`)과 조립기(`ui-src`·`scripts/ui-build.mjs`)는 철거했다.** 되살리지 않는다. `public/ui/assets`의 이미지·폰트는 React 화면이 계속 쓴다.
- `features/f3-reason`에는 현재 런타임 컴포넌트가 없다. 존재하지 않는 공개 폼을 import하거나 같은 폼을 새로 만들지 않는다. 주문 UI를 바꾸면 먼저 **`web/features/f0-home` 범위를 claim**하고 이 `SPEC.md`를 함께 갱신한다.
- 이 폴더의 `lib/*-ui.test.ts`는 옮겨 간 React 화면 소스를 문자열로 읽어 계약을 지키는 가드다. 화면 파일을 옮기거나 이름을 바꾸면 그 가드가 읽는 경로도 같은 변경에서 고친다.
- 외부 시세·뉴스·거래 저장은 브라우저가 공급자에 직접 요청하지 않고 `app/api`만 사용한다. 화면 즉시 상태는 `kw_proto_v1`, 서버 거래 저장은 로그인 세션이 맞을 때 뒤따르는 보조 경로다.
- 완료: 관련 단위 테스트, 프론트 골든 패스, `npm test`, `npm run build`.
