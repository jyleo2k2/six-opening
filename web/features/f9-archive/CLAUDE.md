# f9-archive — 아카이브

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 단일 스펙: `web/features/f9-archive/SPEC.md`. 화면은 이 폴더가 아니라 `web/ui-src/screens/archive.html`과 `web/ui-src/methods/buildArchive.js`에 있다.
- 능력치·캐릭터·레벨 계산은 `shared/engine/archive-profile.js`에만 둔다. 화면은 표시만 한다.
- 그 엔진은 `app.html`에 복사본으로 들어간다. 원본을 고친 뒤 `node scripts/ui-build.mjs build`를 돌리고 `verify`로 확인한다. 복사본을 직접 고치지 않는다.
- 현재 F9는 LLM을 쓰지 않는다. `api/profile`과 `shared/engine/behavior-profile.ts`는 남아 있지만 화면이 부르지 않는다. 되살리려면 두 계산 중 정본을 먼저 정한다.
- 캐릭터를 우열·등수로 표현하지 않는다.
- 완료: 골든 패스 ⑥ + `node scripts/ui-build.mjs verify` + `npm run build`.
