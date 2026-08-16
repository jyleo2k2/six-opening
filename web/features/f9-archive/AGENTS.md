# f9-archive — 아카이브

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 단일 스펙: `web/features/f9-archive/SPEC.md`. 화면은 이 폴더가 아니라 `web/features/f0-home/ArchiveScreen.tsx`와 그 계산 함수(`lib/archive-profile-view.ts`·`lib/archive-feed.ts`·`lib/archive-season.ts`·`lib/use-archive-data.ts`)에 있다. 이 폴더에는 `SPEC.md`와 화면 계약 가드(`lib/archive-feed-db-ui.test.ts`)만 둔다.
- **`지난시즌` 자리에 보이는 값은 서버 값이 아니라 `lib/archive-season.ts`의 픽스처다**(SPEC §5.2). 시즌 경계를 아는 API가 없다. 화면이 픽스처를 직접 읽게 만들지 말고, API가 생기면 `LAST_SEASON` 자리에만 응답을 꽂는다.
- **축 상세 시트에 종목 추천을 붙이지 않는다.** 2026-08-16 디자인 목업에는 "같은 성향 투자자들이 많이 담은 종목" 목록과 주문 흐름이 있지만 루트 가드의 종목 추천·목표가 금지에 걸린다. 붙이려면 통합문서 v2부터 고친다.
- 수익률 탭의 가족 피드는 `/api/family` 거래와 `/api/comments`, `/api/likes` 반응을 사용한다. `arcCmts`·`arcLikes`만 바꾸는 로컬 전용 동작을 다시 만들지 않는다.
- 능력치·캐릭터·레벨 계산은 `shared/engine`에만 둔다. 화면은 표시만 한다.
- **엔진 정본은 `shared/engine/behavior-profile.ts` 한 벌이다**(전 축 0~10·5가 중립, 정확은 체결 2거래일 뒤 종가 채점, 주간 결산 카드 포함, SPEC §6). 화면은 `GET /api/profile/season-cards` 응답을 그대로 읽는다(§6.11).
- 구버전 `shared/engine/archive-profile.js`(0~100)는 **이제 어디서도 import하지 않는다.** iframe 사본과 화면 폴백이 함께 사라졌고 자기 테스트만 남았다. 되살려 두 벌로 만들지 말고, 지울 때는 `archive-profile.test.ts`와 같은 변경에서 지운다.
- 주차 결산 카드를 내는 곳은 `GET /api/profile/season-cards`(로그인 세션의 Supabase) 하나이고 산식은 `computeBehaviorProfile` 한 벌이다. 산식을 화면이나 다른 라우트에 복제하지 않는다.
- `season-cards` 응답은 `weeks[].card`(0~10, `AbilityCard`)와 `cumulative`만 낸다. 0~100 호환 배열은 화면 이관이 끝나 없앴다 — 되살리지 않는다.
- F9는 LLM을 쓰지 않는다. 어느 화면도 부르지 않던 Luna 서술 경로(`POST /api/profile`)는 삭제했고, 서술을 다시 붙일 때는 SPEC에 계약부터 적는다.
- 캐릭터를 우열·등수로 표현하지 않는다.
- 완료: 골든 패스 ⑥ + `npm test` + `npm run build`.
