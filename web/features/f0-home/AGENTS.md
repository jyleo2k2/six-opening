# f0-home — 홈·가족리그

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 스펙은 `docs/기능명세.md`다. 이 폴더는 사용자 화면 7종과 그것을 그리는 호스트 `ConnectedPrototype`, F10 챗봇 오버레이 자리를 소유한다.
- **화면 목록의 원본은 `screen-route.ts`의 `ScreenRoute`다.** 홈·탐색·종목 상세·계좌·랭킹·아카이브·주문이 전부이고, `routeFromPath`가 모르는 주소는 404다.
- **iframe(`/ui/app.html`)과 조립기(`ui-src`·`ui-build.mjs`)는 철거했다.** 되살리지 않는다 — 화면 사각형은 `getPrototypeScreenRect` 순수 계산이 정하고, 실측식과 항등임을 14개 뷰포트에서 확인했다.
- 폰 프레임은 `PhoneFrame`, 하단 탭은 `BottomNav`, 그 기하는 `lib/phone-frame.ts`가 소유한다. 배율은 챗봇이 시트를 맞출 때 쓰는 `getPrototypeScreenRect`와 같은 값이어야 한다.
- **화면 계산은 `lib/`의 순수 함수에 두고 컴포넌트는 붙이기만 한다.** `ranking-data`·`portfolio-view`·`explore-cards`·`home-view`·`stock-news`·`archive-profile-view`·`archive-feed`·`order-view`가 그것이고 각각 테스트를 함께 둔다 — 브라우저 없이 확인할 수 있어야 한다. 손짓 계산도 같다: 바텀 시트를 쓸어내려 닫는 거리·속도는 `lib/sheet-drag.ts`가 정하고, 닫히는 문턱은 챗봇 시트와 같은 `f10-chatbot/lib/bottom-sheet`의 규칙을 쓴다 — 한 폰 안에서 시트마다 닫히는 느낌이 다르면 안 된다.
- 지갑(현금·보유·미체결)은 `lib/use-wallet.ts`, 서버 계좌(`/api/account`)는 `lib/use-account.ts`, 관심 종목(`/api/watchlist`)은 `lib/use-watchlist.ts`, 시세·유니버스는 `lib/use-universe.ts`, 아카이브의 성향·가족·반응은 `lib/use-archive-data.ts`로만 읽는다. **모든 화면이 지갑이 아니라 서버를 본다** — 로그인한 사람의 실제 보유·성향이 원본이다.
- **브라우저 저장소를 쓰지 않는다.** `kw_proto_v1`은 철거했다 — 현금·보유는 `/api/account`, 매수·매도 기록은 `GET /api/trades`, 관심 종목은 `/api/watchlist`가 원본이다. 새 값을 화면에 얹기 전에 그것을 담을 서버 경로가 먼저 있어야 한다. `use-wallet`의 `update()`는 체결 직후 완료 화면이 잔액을 바로 보여 주기 위한 메모리 전용 갱신이고, 곧 `refresh()`가 서버 값으로 덮는다.
- 매수·매도 이유와 보유 계획 문구는 `shared/data/trade-copy.js` 하나가 원본이다. 주문 화면(`OrderScreen`)과 아카이브 피드가 같은 코드를 읽어야 하므로 여기에 다시 적지 않는다.
- 화면끼리의 이동은 `onLeave(path)`로 올려 `ConnectedPrototype`이 처리한다. 컴포넌트가 직접 주소를 바꾸지 않는다.
- 차트 iframe(`/tradingview-chart`)에 보내는 `kiwoom:chart-options`가 남은 유일한 `postMessage`다. 새 메시지 계약을 늘리지 않는다.
- **폰 화면 위에 겹치는 오버레이는 `phoneScreenClipPath`로 화면 사각형에 가둔다.** 오버레이는 iframe·`PhoneFrame` 밖에 있어 프레임 이미지와 스태킹 컨텍스트가 갈리므로 z-index로는 순서를 정할 수 없다. 좌표가 어긋나도 프레임 밖으로 나가지 않게 하는 수단은 자르기뿐이다.
- 화면 사각형은 `ConnectedPrototype`과 `usePhoneScreenRect`가 **같은 `getPrototypeScreenRect(창너비, 창높이)`** 로 잡는다. 기하 상수의 원본은 `f10-chatbot/lib/bottom-sheet`의 `PROTOTYPE_PHONE` 하나다.
- **가족 피드는 `ArchiveScreen` 수익률 탭이 소유한다.** 별도 F11 화면이나 진입 버튼을 다시 만들지 않는다. 반응(댓글·좋아요)은 서버가 원본이고 화면에서 개수를 세지 않는다.
- 현재 메인 프로토타입에는 전역 부모↔자녀 스위처가 연결되지 않았다.
