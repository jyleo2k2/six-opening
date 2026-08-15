# f9-archive — 아카이브

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 단일 스펙: `web/features/f9-archive/SPEC.md`. 화면은 이 폴더가 아니라 `web/ui-src/screens/archive.html`과 `web/ui-src/methods/buildArchive.js`에 있다.
- 수익률 탭의 가족 피드는 `/api/family` 거래와 `/api/comments`, `/api/likes` 반응을 사용한다. `arcCmts`·`arcLikes`만 바꾸는 로컬 전용 동작을 다시 만들지 않는다.
- 능력치·캐릭터·레벨 계산은 `shared/engine`에만 둔다(로그인 정본 `behavior-profile.ts` + 비로그인 폴백 `archive-profile.js`). 화면은 표시만 한다.
- 두 엔진 모두 `app.html`에 복사본으로 들어가는 건 `archive-profile.js`뿐이다. 원본을 고친 뒤 `node scripts/ui-build.mjs build`를 돌리고 `verify`로 확인한다. 복사본을 직접 고치지 않는다.
- 엔진이 두 벌인 건 이관 중이기 때문이다. **로그인 상태 정본은 신버전 `shared/engine/behavior-profile.ts`(SPEC §6)이고, 화면(`buildArchive()`, SPEC §6.11)이 이를 그대로 읽는다. 비로그인·응답 전에만 구버전 `archive-profile.js`(0~100)로 폴백한다.** 신버전은 전 축 0~10에 5가 중립이고 정확은 체결 2거래일 뒤 종가로 채점하며 주간 결산 카드를 함께 낸다. 구버전은 비로그인 폴백과 §3.2 행동 신호 캐릭터 판정에 쓰여 아직 지우지 않는다.
- 주차 결산 카드를 내는 곳은 `GET /api/profile/season-cards`(로그인 세션의 Supabase) 하나이고 산식은 `computeBehaviorProfile` 한 벌이다. 산식을 화면이나 다른 라우트에 복제하지 않는다.
- `season-cards` 응답은 `weeks[].card`(0~10, `AbilityCard`)와 `cumulative`만 낸다. 0~100 호환 배열은 화면 이관이 끝나 없앴다 — 되살리지 않는다.
- F9는 LLM을 쓰지 않는다. 어느 화면도 부르지 않던 Luna 서술 경로(`POST /api/profile`)는 삭제했고, 서술을 다시 붙일 때는 SPEC에 계약부터 적는다.
- 캐릭터를 우열·등수로 표현하지 않는다.
- 완료: 골든 패스 ⑥ + `node scripts/ui-build.mjs verify` + `npm run build`.
