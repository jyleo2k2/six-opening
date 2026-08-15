# f0-home — 홈·가족리그

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 스펙은 `docs/기능명세.md`다. 이 폴더는 `/ui/app.html?runtime=1` iframe과 F10 챗봇 React 오버레이를 조립하는 `ConnectedPrototype`, 그리고 **app.html에서 옮겨 온 화면**을 소유한다.
- 화면을 하나씩 실제 라우트로 옮기는 중이다. 지금까지 옮긴 화면은 `/ranking`(`RankingScreen`) 하나이고, 폰 프레임은 `PhoneFrame`, 그 기하는 `lib/phone-frame.ts`가 소유한다. 배율은 챗봇이 시트를 맞출 때 쓰는 `getPrototypeScreenRect`와 같은 값이어야 한다.
- **아직 안 옮긴 화면(홈·탐색·주문·계좌·아카이브) 본문은 `web/ui-src`가 소유한다.** 그 화면을 이 폴더에 복제하지 않는다.
- 옮겨 온 화면에서 아직 안 옮긴 화면으로 나갈 때는 `lib/leave-to-route.ts`를 쓴다. 문서가 갈아끼워지므로 그 표시가 없으면 작성 중이던 주문 초안이 사라진다.
- **`public/ui/app.html`은 `web/ui-src`를 조립한 생성물이다. 직접 수정·커밋하지 않고 claim도 `web/ui-src` 경로로 한다.** 홈 화면을 고치려면 `web/ui-src/screens/home.html`과 관련 `methods/`를 고치고 `npm run ui:build`로 합친다.
- iframe 메시지는 `lib/prototype-bridge.ts`에서 런타임 검증하고 `origin`과 `source`를 함께 확인한다. F10 화면 이동도 허용된 `postMessage` 계약만 사용한다.
- **가족 피드는 `ui-src` 아카이브 수익률 탭(`screens/archive.html`·`methods/buildArchive.js`)이 소유한다.** 여기에 F11 오버레이나 진입 버튼을 다시 만들지 않는다.
- 현재 메인 프로토타입에는 전역 부모↔자녀 스위처가 연결되지 않았다.
