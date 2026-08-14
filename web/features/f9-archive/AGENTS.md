# f9-archive — 아카이브

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 단일 스펙: `web/features/f9-archive/SPEC.md`. 화면은 이 폴더가 아니라 `web/ui-src/screens/archive.html`과 `web/ui-src/methods/buildArchive.js`에 있다.
- 능력치·캐릭터·레벨 계산은 `shared/engine/archive-profile.js`에만 둔다. 화면은 표시만 한다.
- 그 엔진은 `app.html`에 복사본으로 들어간다. 원본을 고친 뒤 `node scripts/ui-build.mjs build`를 돌리고 `verify`로 확인한다. 복사본을 직접 고치지 않는다.
- 엔진이 두 벌인 건 이관 중이기 때문이다. **화면은 구버전 `archive-profile.js`, 앞으로 갈 정본은 신버전 `shared/engine/behavior-profile.ts`(SPEC §6)** 다. 신버전은 전 축 0~10에 5가 중립이고 정확은 체결 2거래일 뒤 종가로 채점하며 주간 결산 카드를 함께 낸다. 화면 이관이 끝나면 구버전을 지운다.
- 주차 카드 산출이 지금 둘이다 — `GET /api/profile/season-cards`(구버전·정확 기본값)와 `POST /api/profile`의 `weeks[]`(신버전·정확 채점). 화면을 붙이기 전에 어느 쪽을 남길지 정한다.
- 현재 화면 F9는 LLM을 쓰지 않는다. Luna 서술은 `POST /api/profile`에만 있다.
- 캐릭터를 우열·등수로 표현하지 않는다.
- 완료: 골든 패스 ⑥ + `node scripts/ui-build.mjs verify` + `npm run build`.
