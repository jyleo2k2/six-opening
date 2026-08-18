# f9-archive — 아카이브

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 단일 스펙: `web/features/f9-archive/SPEC.md`. 화면은 이 폴더가 아니라 `web/features/f0-home/ArchiveScreen.tsx`와 그 계산 함수(`lib/archive-profile-view.ts`·`lib/archive-feed.ts`·`lib/archive-season.ts`·`lib/use-archive-data.ts`)에 있다. 이 폴더에는 `SPEC.md`와 화면 계약 가드(`lib/archive-feed-db-ui.test.ts`)만 둔다.
- **성향 리포트 탭은 `이번 시즌`·`지난 시즌`이다**(SPEC §1·§5.2). 둘 다 `/api/family`의 구성원 주차 카드(`weeks`)가 원본이고 픽스처는 없다 — `이번 시즌`은 진행 중인 이번 주까지 전체를(`thisSeasonWeeks`, 구성원을 누르면 주차별로 펼친다), `지난 시즌`은 끝난 주만(`closedWeekRows`·`seasonReport`) 쓴다. 시즌 경계를 아는 API가 아직 없어 `지난 시즌`은 실제로는 "끝난 주차 모음"이다 — 경계로 좁히는 것은 그게 실제로 필요해질 때 한다.
- **카드 시트는 성향별 종목 세 개다**(2026-08-17, SPEC §1.1). 다섯 축 막대는 지웠다. 목록은 `archive-profile-view.ts`의 `TYPE_PICKS` 고정 표본이고 이름·로고·시세는 유니버스가 원본이다. 한 줄을 누르면 `/buy/{code}`로 나가고 주문은 F2 화면이 이어받는다 — 시트 안에 주문 흐름을 다시 만들지 않는다.
- **그 시트에 목표가·수익률 전망·매매 시점을 붙이지 않는다.** 종목을 말하는 주체는 화면의 고정 목록뿐이고 **LLM이 종목을 말하는 길은 여전히 막혀 있다**(루트 가드). 통합문서 v2 §21이 이 목록을 **조건부 예외**로 명시한다(v2.13) — 고정 목록·목표가/시점/전망 없음·참고용 각주·유형 없으면 미노출. 조건이 하나라도 깨지면 예외가 아니라 금지로 돌아간다(SPEC §1.1, 법무 검토 §15-1-1).
- 수익률 탭의 가족 피드는 `/api/family` 거래와 `/api/comments`, `/api/likes` 반응을 사용한다. `arcCmts`·`arcLikes`만 바꾸는 로컬 전용 동작을 다시 만들지 않는다.
- 능력치·캐릭터·레벨 계산은 `shared/engine`에만 둔다. 화면은 표시만 한다.
- **엔진 정본은 `shared/engine/behavior-profile.ts` 한 벌이다**(전 축 0~10·5가 중립, 정확은 체결 2거래일 뒤 종가 채점, 주간 결산 카드 포함, SPEC §6). 화면은 `GET /api/profile/season-cards` 응답을 그대로 읽는다(§6.11).
- 구버전 `shared/engine/archive-profile.js`(0~100)는 **이제 어디서도 import하지 않는다.** iframe 사본과 화면 폴백이 함께 사라졌고 자기 테스트만 남았다. 되살려 두 벌로 만들지 말고, 지울 때는 `archive-profile.test.ts`와 같은 변경에서 지운다.
- 주차 결산 카드를 내는 곳은 `GET /api/profile/season-cards`(로그인 세션의 Supabase) 하나이고 산식은 `computeBehaviorProfile` 한 벌이다. 산식을 화면이나 다른 라우트에 복제하지 않는다.
- `season-cards` 응답은 `weeks[].card`(0~10, `AbilityCard`)와 `cumulative`만 낸다. 0~100 호환 배열은 화면 이관이 끝나 없앴다 — 되살리지 않는다.
- F9는 LLM을 쓰지 않는다. 어느 화면도 부르지 않던 Luna 서술 경로(`POST /api/profile`)는 삭제했고, 서술을 다시 붙일 때는 SPEC에 계약부터 적는다.
- 캐릭터를 우열·등수로 표현하지 않는다.
- 완료: 골든 패스 ⑥ + `npm test` + `npm run build`.
