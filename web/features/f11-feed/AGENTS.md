# f11-feed — 가족 거래 피드

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 구현·데이터 단일 스펙: `web/features/f11-feed/SPEC.md`.
- 화면 코드는 이 폴더가 소유한다. `FeedScreen`은 `f0-home/ConnectedPrototype`이 오버레이로 띄운다. 별도 라우트를 만들지 않는다.
- 현재 피드 화면의 본인 거래는 `shared/store/prototype-trades`가 app.html의 `localStorage`에서 읽고, 가족 거래·코멘트·열람 계정은 `use-family-feed-store`의 시드와 별도 localStorage를 쓴다. 이 상태를 Supabase 통합 완료로 설명하지 않는다.
- `app/api/comments`·`app/api/likes`와 가족 범위 검증은 구현돼 있지만 현재 `FeedScreen`은 호출하지 않는다. 프론트 연결 전까지 서버 반응 기능은 미노출이다.
- 차트 매매 지점 마커의 출처는 Supabase `transactions` 하나뿐이다. `GET /api/trades?symbol=`만 읽고 시드·`localStorage`로 되돌리지 않는다.
- 마커 수량 마스킹은 `app/api/trades`가 한다. 열람 계정을 클라이언트로 넘기지 않는다.
- 피드는 거래 기록만 공유한다. 챗봇 대화 원문·행동 데이터·친화도 수치는 올리지 않는다.
- 부모→자녀 코멘트는 `shared/engine/comment-filter`를 반드시 통과시킨다. 자녀→부모는 검사하지 않는다.
- 타인 카드·마커에는 수량·금액을 표시하지 않는다.
- 열람은 상호 열람만 허용한다. 단방향 열람 기능을 만들지 않는다.
- F11의 민지↔엄마 버튼은 피드 내부 열람 상태일 뿐 메인 `app.html` 계정이나 `kw_uid` 서버 세션을 바꾸지 않는다.
- 완료: `web`의 `npm test` + `npm run build`.
