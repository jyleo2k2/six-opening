# f11-feed — 가족 거래 피드

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 구현·데이터 단일 스펙: `web/features/f11-feed/SPEC.md`.
- 이 폴더에는 `SPEC.md`와 가드만 있고 화면 코드는 없다. 피드 화면은 `web/features/f0-home/ArchiveScreen.tsx`의 **수익률(`return`) 탭**이 소유하고 값 계산은 `f0-home/lib/archive-feed.ts`가 한다. 별도 라우트나 `FeedScreen` 같은 전용 컴포넌트를 다시 만들지 않는다 — 예전 `FeedScreen.tsx`는 아카이브 탭으로 합치며 삭제했다.
- 현재 피드 화면의 구성원·거래·성향은 `GET /api/family`, 코멘트·좋아요는 `GET/POST/DELETE /api/comments`와 `GET/POST /api/likes`가 같은 `family_tag`의 Supabase 데이터로 제공한다.
- 반응 조회는 거래 id 목록을 한 번에 보내고, 작성자 표시는 서버가 반환한 실제 `profiles.name`을 쓴다. 부모 역할명만으로 엄마·아빠를 추정하지 않는다.
- 차트 매매 지점 마커의 출처는 Supabase `transactions` 하나뿐이다. `GET /api/trades?symbol=`만 읽고 시드·`localStorage`로 되돌리지 않는다.
- 마커 수량 마스킹은 `app/api/trades`, 피드 수량·체결가 마스킹은 `app/api/family`가 한다. 로그인 사용자를 클라이언트 필터로 바꾸지 않는다.
- 피드는 거래 기록만 공유한다. 챗봇 대화 원문·행동 데이터·친화도 수치는 올리지 않는다.
- 부모→자녀 코멘트는 `shared/engine/comment-filter`를 반드시 통과시킨다. 자녀→부모는 검사하지 않는다.
- 타인 카드·마커에는 수량·금액을 표시하지 않는다.
- 열람은 상호 열람만 허용한다. 단방향 열람 기능을 만들지 않는다.
- 피드의 가족 구성원 버튼은 거래 필터일 뿐 화면 계정이나 `kw_uid` 서버 세션을 바꾸지 않는다.
- 완료: `web`의 `npm test` + `npm run build`.
