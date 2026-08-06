# 물려주는 계좌 — 영웅문 주니어

키움증권 KDA 프로젝트. **이미 열려 있는 미성년 계좌를 아이의 교재로 바꾸는** 서비스다.

제품은 세 기둥으로 이뤄진다. 팀 6인이 2명씩 나눠 맡는다.

| # | 기둥 | 담당 | 경로 |
|---|---|---|---|
| ① | **전략시뮬게임** | 이재용·이호연 | `game/` |
| ② | **뉴스** (아이 눈높이) | 박혜준·강소정 | `web/**/news`, `web/lib/news` |
| ③ | **실제투자** (제안→승인→체결) | 김설빈·김경렬 | `web/`(news 제외) |

**팀장은 김설빈** (무엇을 언제 할지), **통합 오너는 이재용** (누가 공유 파일을 쓸지, 머지 승인).

## 폴더 지도

| 경로 | 내용 |
|---|---|
| `물려주는계좌_기획안.md` | **기획안 v2.0. 제품 결정의 근거는 여기다.** |
| `docs/team/_공통_AI규칙.md` | **프로젝트 헌장. 모든 AI가 지키는 고정 규칙.** |
| `docs/team/<이름>/` | 팀원별 담당업무 + AI 명령 프롬프트 |
| `docs/game-design.md` | 전략시뮬게임 설계안 v1.0 |
| `docs/mvp-backlog.md` | 게임 MVP 백로그 (T1~T10) — 게임 트랙의 작업 지시서 |
| `docs/engine-migration.md` | 게임 엔진 교체 비용 분석 (Phase 1 이후) |
| `game/src` · `game/tests` | 게임 룰 엔진 (순수 TS) — **룰의 유일한 SSOT** |
| `game/ui` | 게임 화면 (Vite + React). 엔진을 import만 한다 |
| `web/` | Next.js 앱 — 아이 앱 + 영웅문 내 부모 메뉴. 앱 규칙은 `web/AGENTS.md` |
| `prototype/step1-input.html` | 제안서 입력 방식 A/B 비교 프로토타입 |
| `scripts/git_session_manager.py` | 병렬 Git 세션 관제 (하네스) |
| `.claude/` · `.agents/` | 에이전트·스킬 정의 |

## 병렬 작업 — 브랜치와 워크트리

여러 명이 Claude Code·Codex를 동시에 돌린다. **파일 충돌은 규율이 아니라 도구로 막는다.**

```
브랜치    <도구>/<작업자>/<작업명>
          도구    codex | claude
          작업자  이재용 이호연 박혜준 강소정 김설빈 김경렬
          작업명  영문 소문자·숫자로 시작, [a-z0-9._-]만

워크트리  C:\dev\six-opening-<도구>-<작업자>-<작업명>   (start가 자동 생성)
루트      C:\dev\six-opening 은 항상 깨끗한 main — 관제 전용, 여기서 코드를 고치지 않는다
```

한 작업 = 한 브랜치 = 한 워크트리 = 한 PR.

```powershell
# 새 작업 시작 (깨끗한 main 루트에서)
uv run python scripts/git_session_manager.py start `
  --tool claude --worker 박혜준 --task kid-news-feed `
  --path web/app/kid/news --path web/lib/news

# 상태 확인 / 장기 세션 유지 / 종료
uv run python scripts/git_session_manager.py status
uv run python scripts/git_session_manager.py heartbeat
uv run python scripts/git_session_manager.py release
```

claim한 경로가 다른 활성 세션이나 열린 PR과 겹치면 **세션 생성 자체가 거부된다.**
상세 규약은 `.claude/skills/git-session-manager/references/team-git-policy.md`.

> 이 저장소는 턴을 차단하는 자동 훅을 걸지 않았다. 차단은 `start`·`claim` 시점에만 일어나고,
> 편집 시점 검사(`guard`)는 수동 실행이다.

## AGENTS.md ↔ CLAUDE.md 동기화 (필수)

에이전트 지침 파일이 두 벌씩 있다. **하나를 고치면 반드시 다른 하나도 같은 커밋에서 고쳐라.**
한쪽만 바꾸면 Codex와 Claude Code가 서로 다른 규칙으로 움직인다.

| 쌍 | 파일 |
|---|---|
| 루트 | `AGENTS.md` ↔ `CLAUDE.md` |
| 앱 | `web/AGENTS.md` ↔ `web/CLAUDE.md` |
| 게임 | `game/AGENTS.md` ↔ `game/CLAUDE.md` |
| 스킬 | `.claude/skills/` ↔ `.agents/skills/` |

지키는 방법:

1. **규칙 본문은 항상 `AGENTS.md`에 쓴다.** Codex가 읽는 파일이다.
2. **`CLAUDE.md`는 `@AGENTS.md` import 한 줄을 유지한다.** 이 import가 동기화 장치다 —
   import를 지우고 본문을 복사하면 그 순간부터 두 파일이 갈라진다.
3. Claude 전용 내용을 `CLAUDE.md`에 직접 써야 한다면, **같은 커밋에서 `AGENTS.md`에도 동일하게 반영해라.**
4. 앱 규칙을 고쳤는데 루트 설명이 어긋나면 루트도 같이 고친다.

**이 파일들과 기획안·헌장은 이재용만 수정한다.** 다른 팀원의 AI는 동기화 갱신을 포함해 어떤 이유로도 편집하지 않는다.

## 시작하기

```powershell
# 아이 앱 + 부모 메뉴
cd web
npm install
cp .env.example .env.local   # 키움 모의투자 키 · ANTHROPIC_API_KEY
npm run dev

# 전략시뮬게임
cd game;    npm install     # 룰 엔진 + 시뮬레이터
cd game/ui; npm install     # 게임 화면
npm run dev                 # http://localhost:5178
```

## 검증

자동 훅이 없다. **바꾼 영역의 명령을 직접 돌리고 결과로 보고한다. 추측 금지.**

```powershell
cd game;    npm test          # 룰 정합성
cd game;    npm run sim       # 밸런스 + 교육 메시지 3종
cd game/ui; npm run build     # tsc + vite build
cd game/ui; npm run e2e       # 1판 완주 (dev 서버 필요)

cd web; npm run typecheck     # next typegen + tsc --noEmit
cd web; npm test              # 안전장치 규칙 단위 테스트
cd web; npm run verify        # 기획안 조항 검증 (dev 서버 필요)
```

`web/scripts/verify.ts`가 기획안 v2.0의 조항을 실행 가능한 형태로 담고 있다.
**기능을 추가할 땐 체크를 먼저 쓰고 구현해라.**
