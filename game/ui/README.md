# 주식 카드 배틀 — 세로 UI 프로토타입 (Phase 1 MVP)

AI(greedy 봇) 상대 1판 완주용 화면. 룰은 전부 `../src` 엔진을 `@engine/*`로 직접 import한다 (재구현 금지).

## 실행

```bash
npm install
npm run dev      # http://localhost:5178
npm run build    # tsc + vite build
npm run e2e      # dev 서버 떠 있는 상태에서 자동 1판 완주 (E2E_SHOTS=1 이면 스크린샷 저장)
```

## 화면 구조 (세로 430px 기준)

- 상단 바: 라운드 / AI 자산 / 새 게임
- 뉴스 예고: 다음 월드 이벤트 헤드라인 + 몇 라운드 뒤 발동
- 시장: 종목 4개 (시세·등락·스파크라인·양측 보유 배지). 타겟 카드 선택 시 깜빡임
- 하단: 내 자산 바(마진콜 50만~목표 150만) / 손패(코스트·효과·? 툴팁) / 에너지 / 턴 종료
- 정산 오버레이: 이벤트·AI 행동·종목 등락·양측 자산 변화

## 진행 흐름

내 턴 (카드 자유 사용) → 턴 종료 → AI 턴 (행동 피드) → 정산 리포트 → 다음 라운드. 승패는 엔진의 마진콜/목표 선점/15라운드 판정 그대로.

## 구조

- `src/useMatch.ts` — 매치 진행 훅. `createGame`/`startTurn`/`playCard`/`marketPhase`/`resolveTimeout` 호출 순서는 엔진 `runGame`과 동일
- `src/App.tsx` — 화면 전부
- `src/cardMeta.ts` — 카드 효과 문구(엔진 config에서 파생) + 한 줄 툴팁 (설계 7절)
- `src/eventMessages.ts` — `GameEvent` → 한 줄 한국어 피드백 (T2)
- `src/progression.ts` — 별점·골드·랭크·localStorage 영속 (T3)
- `scripts/e2e-playthrough.mjs` — Playwright 1판 완주 스모크
- `scripts/verify-*.mjs` — 태스크별 검증 (loop1 / t2 / t3 / t4)

`@engine/*` alias는 `vite.config.ts`와 `tsconfig.json` 양쪽에 있다. **한쪽만 고치면 dev는 되고 빌드가 깨진다.**

메모: vite dev 서버는 `--host 127.0.0.1`로 띄운다 (기본 ::1 바인딩이라 localhost 접근이 흔들릴 수 있음).
