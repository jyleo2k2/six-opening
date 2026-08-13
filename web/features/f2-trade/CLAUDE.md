# f2-trade — 모의투자

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- F2·F3 단일 스펙은 `web/features/f2-trade/SPEC.md`다. 현재 탐색·상세·매수·매도·질문식 기록 UI와 즉시 상태는 `web/public/ui/app.html`이 소유하고, 이 폴더는 TradingView 차트·차트 변환·뉴스 공개 계약과 뉴스 파이프라인 프로토타입을 소유한다.
- `features/f3-reason`에는 현재 런타임 컴포넌트가 없다. 존재하지 않는 공개 폼을 import하거나 같은 폼을 새로 만들지 않는다. 주문 UI를 바꾸면 먼저 `public/ui/app.html` 범위를 claim하고 이 `SPEC.md`를 함께 갱신한다.
- 외부 시세·뉴스·거래 저장은 브라우저가 공급자에 직접 요청하지 않고 `app/api`만 사용한다. 화면 즉시 상태는 `kw_proto_v1`, 서버 거래 저장은 로그인 세션이 맞을 때 뒤따르는 보조 경로다.
- 완료: 관련 단위 테스트, 프론트 골든 패스, `npm test`, `npm run build`.
