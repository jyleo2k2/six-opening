# f0-home — 홈·가족리그

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 스펙은 `docs/기능명세.md`다. 이 폴더는 `/ui/app.html?runtime=1` iframe과 F10 챗봇 React 오버레이를 조립하는 `ConnectedPrototype`, 그리고 **app.html에서 옮겨 온 화면**을 소유한다.
- **옮겨 온 화면 목록의 원본은 `ConnectedPrototype`의 `MIGRATED_SCREENS`다.** 현재 홈·탐색·종목 상세·계좌·랭킹이 여기 있고, 화면을 옮길 때마다 이 집합에 추가한다.
- **옮겨 온 화면도 iframe을 끄지 않고 그 위에 얹는다.** 갈라 렌더하면 화면을 오갈 때마다 `app.html`이 처음부터 다시 떠서 `/api/account` 응답 전까지 남의 계좌가 잠깐 보인다.
- **아직 안 옮긴 화면(주문·아카이브) 본문은 `web/ui-src`가 소유한다.** 그 화면을 이 폴더에 복제하지 않는다.
- 폰 프레임은 `PhoneFrame`, 하단 탭은 `BottomNav`, 그 기하는 `lib/phone-frame.ts`가 소유한다. 배율은 챗봇이 시트를 맞출 때 쓰는 `getPrototypeScreenRect`와 같은 값이어야 한다.
- **화면 계산은 `lib/`의 순수 함수에 두고 컴포넌트는 붙이기만 한다.** `ranking-data`·`portfolio-view`·`explore-cards`·`home-view`·`stock-news`가 그것이고 각각 테스트를 함께 둔다 — 브라우저 없이 확인할 수 있어야 한다.
- 지갑(`kw_proto_v1`)은 `lib/use-wallet.ts`, 서버 계좌(`/api/account`)는 `lib/use-account.ts`, 시세·유니버스는 `lib/use-universe.ts`로만 읽는다. **홈은 지갑이 아니라 서버 계좌를 본다** — 로그인한 사람의 실제 보유가 원본이다.
- 옮겨 온 화면끼리의 이동은 `onLeave(path)`로 올려 `ConnectedPrototype`이 처리한다. 컴포넌트가 직접 주소를 바꾸지 않는다. `app.html` 쪽에서 나올 때는 `ui-src`의 `leaveToRoute(path)`가 `kiwoom:open-route` 메시지를 보낸다 — 문서가 갈아끼워지므로 그 표시가 없으면 작성 중이던 주문 초안이 사라진다.
- **`public/ui/app.html`은 `web/ui-src`를 조립한 생성물이다. 직접 수정·커밋하지 않고 claim도 `web/ui-src` 경로로 한다.** 남은 화면을 고치려면 해당 `screens/*.html`과 관련 `methods/`를 고치고 `npm run ui:build`로 합친다.
- iframe 메시지는 `lib/prototype-bridge.ts`에서 런타임 검증하고 `origin`과 `source`를 함께 확인한다. F10 화면 이동도 허용된 `postMessage` 계약만 사용한다.
- **폰 화면 위에 겹치는 오버레이는 `phoneScreenClipPath`로 화면 사각형에 가둔다.** 오버레이는 iframe·`PhoneFrame` 밖에 있어 프레임 이미지와 스태킹 컨텍스트가 갈리므로 z-index로는 순서를 정할 수 없다. 좌표가 어긋나도 프레임 밖으로 나가지 않게 하는 수단은 자르기뿐이다.
- 화면 사각형은 `ConnectedPrototype`이 iframe 안 `#kw-screen`을 `ResizeObserver`로 재고, 옮겨 온 화면은 `usePhoneScreenRect`가 잰다. 창 크기로 다시 계산하지 않는다 — 배율 갱신 순서가 어긋나면 그 값이 다음 창 크기 변경까지 남는다.
- **가족 피드는 `ui-src` 아카이브 수익률 탭(`screens/archive.html`·`methods/buildArchive.js`)이 소유한다.** 여기에 F11 오버레이나 진입 버튼을 다시 만들지 않는다.
- 현재 메인 프로토타입에는 전역 부모↔자녀 스위처가 연결되지 않았다.
