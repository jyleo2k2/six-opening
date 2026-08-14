# f0-home — 홈·가족리그

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 스펙은 `docs/기능명세.md`다. 현재 이 폴더는 홈 화면 자체가 아니라 `/ui/app.html?runtime=1` iframe과 F10 챗봇 React 오버레이를 조립하는 `ConnectedPrototype`을 소유한다.
- 홈·탐색·주문·계좌·랭킹·아카이브 본문은 `web/public/ui/app.html`이 소유한다. 이 폴더에 같은 화면이나 상태를 복제하지 않는다.
- iframe 메시지는 `lib/prototype-bridge.ts`에서 런타임 검증하고 `origin`과 `source`를 함께 확인한다. F10 화면 이동도 허용된 `postMessage` 계약만 사용한다.
- **가족 피드는 `app.html` 아카이브 수익률 탭이 소유한다.** 여기에 F11 오버레이나 진입 버튼을 다시 만들지 않는다.
- 현재 메인 프로토타입에는 전역 부모↔자녀 스위처가 연결되지 않았다.
