# f0-home — 홈·가족리그

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 스펙은 `docs/기능명세.md`다. 이 폴더는 `/ui/app.html?runtime=1` iframe과 F10 챗봇 React 오버레이를 조립하는 `ConnectedPrototype`, 그리고 **app.html에서 옮겨 온 화면**을 소유한다.
- **옮겨 온 화면 목록의 원본은 `ConnectedPrototype`의 `MIGRATED_SCREENS`다.** 현재 홈·탐색·종목 상세·계좌·랭킹·아카이브·매수·매도가 여기 있다 — 사용자 화면은 전부 옮겨 왔다.
- **옮겨 온 화면도 iframe을 끄지 않고 그 위에 얹는다.** 갈라 렌더하면 화면을 오갈 때마다 `app.html`이 처음부터 다시 떠서 `/api/account` 응답 전까지 남의 계좌가 잠깐 보인다.
- `web/ui-src`의 화면 사본은 iframe 안에 그대로 남아 있지만 사용자에게 보이는 정본은 이 폴더의 React 화면이다. 화면을 고칠 때 `ui-src` 쪽 사본을 함께 고치지 않는다 — 그 사본은 iframe 철거 때 같이 걷어 낸다.
- 폰 프레임은 `PhoneFrame`, 하단 탭은 `BottomNav`, 그 기하는 `lib/phone-frame.ts`가 소유한다. 배율은 챗봇이 시트를 맞출 때 쓰는 `getPrototypeScreenRect`와 같은 값이어야 한다.
- **화면 계산은 `lib/`의 순수 함수에 두고 컴포넌트는 붙이기만 한다.** `ranking-data`·`portfolio-view`·`explore-cards`·`home-view`·`stock-news`·`archive-profile-view`·`archive-feed`·`order-view`가 그것이고 각각 테스트를 함께 둔다 — 브라우저 없이 확인할 수 있어야 한다. 손짓 계산도 같다: 바텀 시트를 쓸어내려 닫는 거리·속도는 `lib/sheet-drag.ts`가 정하고, 닫히는 문턱은 챗봇 시트와 같은 `f10-chatbot/lib/bottom-sheet`의 규칙을 쓴다 — 한 폰 안에서 시트마다 닫히는 느낌이 다르면 안 된다.
- 지갑(`kw_proto_v1`)은 `lib/use-wallet.ts`, 서버 계좌(`/api/account`)는 `lib/use-account.ts`, 시세·유니버스는 `lib/use-universe.ts`, 아카이브의 성향·가족·반응은 `lib/use-archive-data.ts`로만 읽는다. **홈과 아카이브는 지갑이 아니라 서버를 본다** — 로그인한 사람의 실제 보유·성향이 원본이다.
- 매수·매도 이유와 보유 계획 문구는 `shared/data/trade-copy.js` 하나가 원본이다. 주문 화면(`OrderScreen`)과 아카이브 피드가 같은 코드를 읽어야 하므로 여기에 다시 적지 않는다.
- 옮겨 온 화면끼리의 이동은 `onLeave(path)`로 올려 `ConnectedPrototype`이 처리한다. 컴포넌트가 직접 주소를 바꾸지 않는다. `app.html` 쪽에서 나올 때는 `ui-src`의 `leaveToRoute(path)`가 `kiwoom:open-route` 메시지를 보낸다 — 문서가 갈아끼워지므로 그 표시가 없으면 작성 중이던 주문 초안이 사라진다.
- **`public/ui/app.html`은 `web/ui-src`를 조립한 생성물이다. 직접 수정·커밋하지 않고 claim도 `web/ui-src` 경로로 한다.** iframe 쪽을 고칠 일이 있으면 해당 `screens/*.html`과 관련 `methods/`를 고치고 `npm run ui:build`로 합친다.
- iframe 메시지는 `lib/prototype-bridge.ts`에서 런타임 검증하고 `origin`과 `source`를 함께 확인한다. F10 화면 이동도 허용된 `postMessage` 계약만 사용한다.
- **폰 화면 위에 겹치는 오버레이는 `phoneScreenClipPath`로 화면 사각형에 가둔다.** 오버레이는 iframe·`PhoneFrame` 밖에 있어 프레임 이미지와 스태킹 컨텍스트가 갈리므로 z-index로는 순서를 정할 수 없다. 좌표가 어긋나도 프레임 밖으로 나가지 않게 하는 수단은 자르기뿐이다.
- 화면 사각형은 `ConnectedPrototype`이 iframe 안 `#kw-screen`을 `ResizeObserver`로 재고, 옮겨 온 화면은 `usePhoneScreenRect`가 잰다. 창 크기로 다시 계산하지 않는다 — 배율 갱신 순서가 어긋나면 그 값이 다음 창 크기 변경까지 남는다.
- **가족 피드는 `ArchiveScreen` 수익률 탭이 소유한다.** 별도 F11 화면이나 진입 버튼을 다시 만들지 않는다. 반응(댓글·좋아요)은 서버가 원본이고 화면에서 개수를 세지 않는다.
- 현재 메인 프로토타입에는 전역 부모↔자녀 스위처가 연결되지 않았다.
