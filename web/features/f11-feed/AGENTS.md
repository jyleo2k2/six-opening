# f11-feed — 가족 거래 피드

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 구현·데이터 단일 스펙: `web/features/f11-feed/SPEC.md`.
- 화면 코드는 이 폴더가 소유한다. `FeedScreen`은 `f0-home/ConnectedPrototype`이 오버레이로 띄운다. 별도 라우트를 만들지 않는다.
- 피드 화면의 본인 거래는 `shared/store/prototype-trades`가 app.html의 `localStorage`에서 읽는다. 별도 투자 스토어를 만들면 저장소가 갈라진다.
- 차트 매매 지점 마커의 출처는 Supabase `transactions` 하나뿐이다. `GET /api/trades?symbol=`만 읽고 시드·`localStorage`로 되돌리지 않는다.
- 마커 수량 마스킹은 `app/api/trades`가 한다. 열람 계정을 클라이언트로 넘기지 않는다.
- 피드는 거래 기록만 공유한다. 챗봇 대화 원문·행동 데이터·친화도 수치는 올리지 않는다.
- 부모→자녀 코멘트는 `shared/engine/comment-filter`를 반드시 통과시킨다. 자녀→부모는 검사하지 않는다.
- 타인 카드·마커에는 수량·금액을 표시하지 않는다.
- 열람은 상호 열람만 허용한다. 단방향 열람 기능을 만들지 않는다.
- 완료: `web`의 `npm test` + `npm run build`.
