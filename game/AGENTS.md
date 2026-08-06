# 전략시뮬게임 — 주식 카드 배틀

**"자산이 곧 HP다."** 초등 고학년~중학생을 위한 턴제 주식 카드 배틀.
카드 이름이 전부 주식 용어이고, 시장은 나와 상대가 공유한다.

설계 SSOT: `../docs/game-design.md`. 작업 지시서: `../docs/mvp-backlog.md`.

## AGENTS.md ↔ CLAUDE.md 동기화 (필수)

**`game/AGENTS.md`를 고치면 `game/CLAUDE.md`도 같은 커밋에서 함께 확인·수정해라.**

- 규칙 본문은 항상 `AGENTS.md`에 쓴다 (Codex가 읽는 파일).
- `CLAUDE.md`는 `@AGENTS.md` import 한 줄을 유지한다 — 이 import가 동기화 장치다.
- 이 두 파일은 **이재용만 수정한다.**

## 구조와 담당

```
game/src/    룰 엔진 (순수 TS)   ← 룰의 유일한 SSOT. 시뮬레이터·테스트·UI가 공유    [이재용]
game/tests/  룰 정합성 유닛 테스트                                                  [이재용]
game/ui/     게임 화면 (Vite + React DOM). 엔진을 import해서 그리기만 함            [이호연]
```

| 파일 | 내용 |
|---|---|
| `src/types.ts` | 상태·카드·설정·`GameEvent` 타입 (**핫스팟** — 엔진 계약) |
| `src/cards.ts` | MVP 카드 15종, 기본 덱 22장, 실명 종목 4개, 월드 이벤트 |
| `src/engine.ts` | 헤드리스 룰 엔진. `DEFAULT_CONFIG`가 현행 밸런스 수치 (**핫스팟**) |
| `src/bots.ts` | 봇 7종 — greedy/turtle/yolo/diversify/illegal/signal/shark |
| `src/difficulty.ts` | AI 난이도 3티어 (T5) |
| `src/simulate.ts` | 셀프플레이 밸런스 리포트 |

## 절대 규칙

- **룰은 `game/src`에만 쓴다.** `game/ui`는 엔진을 import만 하고 룰을 재구현하지 않는다.
  재구현하는 순간 셀프플레이 검증 루프(설계 11절)가 무의미해진다.
- **`game/ui`는 엔진 함수 9개만 호출한다.**
  `createGame` · `startTurn` · `playCard` · `legalPlays` · `marketPhase` · `resolveTimeout` ·
  `assets` · `holdingsValue` · `mulligan`
- **엔진은 한국어 문구를 만들지 않는다.** 숫자·식별자만 `GameEvent`로 내보내고,
  문장은 UI(`ui/src/eventMessages.ts`) 책임이다.
- **교육 메시지 3종을 유지한다**: 분산 > 몰빵, 정직 > 불법, 시그널 활용 > 무시.
  `npm run sim`에서 역전되면 그 변경은 되돌린다.
- **설계 문서 동기화**: 룰·수치가 바뀌면 `../docs/game-design.md`의 해당 절과 11절 스냅샷을 갱신한다.
- **범위 엄수**: 백로그에 없는 기능을 추가하지 않는다. 필요하면 백로그에 제안으로 적고 확인을 기다린다.

## `@engine` alias

`game/ui`는 `@engine/*`으로 엔진을 import한다. `../src/*`를 가리킨다
(`ui/vite.config.ts`, `ui/tsconfig.json` 양쪽에 설정되어 있다 — 한쪽만 고치면 dev는 되고 빌드가 깨진다).

## 검증

```powershell
cd game;    npm test          # 룰 정합성 (수치와 무관하게 고정 config로 검증)
cd game;    npm run sim       # 밸런스 리포트 (기본 1000판, `npm run sim 200`으로 판 수 지정)
cd game/ui; npm run build     # tsc --noEmit + vite build
cd game/ui; npm run dev       # http://localhost:5178 (별도 터미널)
cd game/ui; npm run e2e       # 1판 완주 스모크
cd game/ui; npm run verify:t2 # 판정 피드백
cd game/ui; npm run verify:t3 # 매치 종료 정산
cd game/ui; npm run verify:t4 # 멀리건
```

**밸런스 루프**: 수치를 바꾸면 `npm test`(룰 안 깨졌나) → `npm run sim`(목표 지표) →
`docs/game-design.md` 11절 스냅샷 갱신.

**함정**: 이 환경의 Vite는 IPv6(`::1`)에만 바인딩될 수 있다. e2e 기본 URL이 `127.0.0.1`이므로
접속이 거부되면 `$env:E2E_URL = "http://localhost:5178/"`를 지정하고 실행한다.
