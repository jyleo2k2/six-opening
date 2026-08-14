# f9-archive — 아카이브

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 단일 스펙: `web/features/f9-archive/SPEC.md`. 화면은 이 폴더가 아니라 `web/ui-src/screens/archive.html`과 `web/ui-src/methods/buildArchive.js`에 있다.
- 수익률 탭의 가족 피드는 `/api/family` 거래와 `/api/comments`, `/api/likes` 반응을 사용한다. `arcCmts`·`arcLikes`만 바꾸는 로컬 전용 동작을 다시 만들지 않는다.
- 능력치·캐릭터·레벨 계산은 `shared/engine/archive-profile.js`에만 둔다. 화면은 표시만 한다.
- 그 엔진은 `app.html`에 복사본으로 들어간다. 원본을 고친 뒤 `node scripts/ui-build.mjs build`를 돌리고 `verify`로 확인한다. 복사본을 직접 고치지 않는다.
- 엔진이 두 벌인 건 이관 중이기 때문이다. **화면은 구버전 `archive-profile.js`, 앞으로 갈 정본은 신버전 `shared/engine/behavior-profile.ts`(SPEC §6)** 다. 신버전은 전 축 0~10에 5가 중립이고 정확은 체결 2거래일 뒤 종가로 채점하며 주간 결산 카드를 함께 낸다. 화면 이관이 끝나면 구버전을 지운다.
- 주차 결산 카드를 내는 곳은 둘이지만 **산식은 한 벌**이다 — `POST /api/profile`(로컬 `kw_proto_v1`+시드)과 `GET /api/profile/season-cards`(로그인 세션의 Supabase). 둘 다 `computeBehaviorProfile`을 쓴다. 새 산식을 한쪽에만 넣지 않는다.
- `season-cards` 응답은 화면이 아직 읽는 `scores`(0~100)를 호환용으로 유지하고 신버전 값은 `card`에 넣는다. 화면 이관이 끝나면 호환 필드를 지운다.
- 현재 화면 F9는 LLM을 쓰지 않는다. Luna 서술은 `POST /api/profile`에만 있다.
- 캐릭터를 우열·등수로 표현하지 않는다.
- 완료: 골든 패스 ⑥ + `node scripts/ui-build.mjs verify` + `npm run build`.
