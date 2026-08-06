# game — 룰 엔진 · 데이터 · PvP 서버 · 시뮬 세션 하네스

> 적용 범위: `game/` 하위 전체.
> 규칙 본문은 이 파일에만 쓴다. 같은 폴더 `CLAUDE.md`는 `@AGENTS.md` 한 줄이다 (루트 `AGENTS.md` §동기화).
> 최종 갱신: 2026-08-06

## 담당 오너

**이재용·이호연** (트랙 ①). 룰 판정과 밸런스 수치의 변경은 오너 합의 후 진행한다.
다른 트랙은 버그 수정·리팩터링이라도 **판정 결과나 시뮬 수치가 바뀌면** 합의 없이 머지하지 않는다.

## 세션 시작 규칙

1. 루트 `AGENTS.md` → `docs/기획서.md`(룰 근거) → 이 파일 순서로 읽는다.
2. 루트 `C:\dev\six-opening`에서 고치지 않는다. `git_session_manager.py start`로 워크트리를 받아 거기서 작업한다.
3. claim 범위 밖(`web/` · `content/` · `pipelines/`)은 수정하지 않는다. 범위가 늘면 claim을 먼저 갱신한다.

## 소유 경계

| 경로 | 내용 |
|---|---|
| `src/` | 룰 엔진 — **룰의 SSOT**. 순수 함수만 |
| `data/` | 카드 풀 · 이벤트×섹터 매트릭스 — 밸런스 시뮬 대상 |
| `server/` | Colyseus 룸 — 서버 권위 판정·턴 타이머 |
| `sim/` | 셀프플레이 밸런스 시뮬레이터 |
| `tests/` | vitest |

`web/app/(child)/game`도 트랙 ① 소유지만 프론트 규약은 `web/AGENTS.md`를 따른다.

## 불변식

- **`src/`는 순수하다.** I/O·네트워크·DOM·`Date.now()` 의존 금지. 서버와 UI 없이 시뮬이 돌아야 한다.
- **`Math.random()` 직접 호출 금지.** 난수는 `src/rng.ts`(mulberry32, 시드는 상태에 보관)만 쓴다. 같은 시드 = 같은 판 = 재현 가능한 시뮬.
- **`src/index.ts` 공개 API가 룰의 유일한 진입점이다.** web·server·sim이 전부 여기만 import한다. 판정을 클라이언트나 서버에 복제하지 않는다.
- 효과는 항상 **섹터 단위**다. 종목 고유 지정 금지 (기획서 §4.1).
- 가격은 `현재가 = 시작가 × ∏(1 + 효과ᵢ)`, 원화는 원 단위·달러는 센트 단위 반올림 (`src/pricing.ts`).
- **비공격 원칙**: 상대를 직접 공격·사보타지하는 카드를 추가하지 않는다. 하락은 경제환경 또는 뉴스의 현실적 반대급부로만 발생한다 (기획서 §1.2).

## 밸런스 수치 변경 규칙

`data/`의 매트릭스·카드 수치나 `src/rules.ts` 상수를 바꾸면 **감이 아니라 수치로 증명한다.**

1. `npm run test -w game` 통과
2. `npm run sim -w game -- 5000`을 변경 전후로 돌려 **선공 승률 · 무승부율 · 자산 p50/p90 · 이벤트 등장 빈도를 전후 표로 PR에 붙인다**
3. 기획서 §8 매트릭스와 어긋나면 기획서 갱신을 이재용에게 요청한다 (기획서는 이재용만 수정)

## 검증 명령

**PowerShell에서 실행한다** — Bash 툴 셸에는 node가 PATH에 없어 `vitest`가 뜨지 않는다.

```powershell
npm run test -w game         # vitest
npm run typecheck -w game    # tsc --noEmit
npm run sim -w game          # 밸런스 시뮬
npm run sim -w game -- 5000  # 수치 변경 시
```
