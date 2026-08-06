# six-opening — 키즈:키움 단독 웹앱

키움증권 KDA 프로젝트. 부모·자녀 화면 + 증권 교육용 1:1 턴제 PvP 카드게임 + 투자제안서(제안→승인→체결)를
하나의 Next.js 앱에 담는다. 제품 결정의 근거는 `docs/기획서.md`, 구조는 `docs/구현계획.md`다.

팀 6인이 2명씩 세 트랙을 나눠 맡는다.

| # | 트랙 | 담당 | 경로 |
|---|---|---|---|
| ① | **게임** (룰 엔진·게임 화면) | 이재용·이호연 | `game/`, `web/app/(child)/game` |
| ② | **투자제안서** (제안→승인→체결) | 김설빈·박혜준 | `web/lib/brokerage`, `web/features/proposal`, `web/app/(child)/{home,stock,proposal}`, `web/app/(parent)`, `web/app/(public)/invite` |
| ③ | **뉴스·도감** (아이 눈높이) | 김경렬·강소정 | `pipelines/`, `content/`, `web/app/(child)/{news,dex}` |

**팀장은 김설빈** (무엇을 언제 할지), **통합 오너는 이재용** (누가 공유 파일을 쓸지, 머지 승인).

## 폴더 지도

| 경로 | 내용 |
|---|---|
| `docs/기획서.md` | **기획서 v0.3 (룰 확정판). 게임 룰 결정의 근거는 여기다.** |
| `docs/구현계획.md` | **구현계획 v2 — 폴더 구조·마일스톤·승계 원칙** |
| `docs/기술스택-v0.1.md` | 기술 스택 결정 기록 |
| `game/` | 룰 엔진(SSOT)·카드/이벤트 데이터·Colyseus 서버·밸런스 시뮬 |
| `web/` | Next.js 자녀 셸 + 부모 뷰 |
| `content/` | 도감·뉴스 MDX (사람 검수 후 커밋) |
| `pipelines/` | Python(uv) 배치 — 종가 스냅샷·뉴스 재작성 |
| `scripts/git_session_manager.py` | 병렬 Git 세션 관제 (하네스) |
| `.claude/` · `.agents/` | 에이전트·스킬 정의 |

## 세션 하네스 — 폴더 진입점을 먼저 읽어라

`game/` · `web/` · `content/` · `pipelines/` 아래를 작업하는 세션은 **그 폴더의 `AGENTS.md`를 먼저 읽는다.**
담당 오너, 수정 금지 경계, 불변식, 검증 명령의 SSOT는 루트가 아니라 그 파일이다.

| 폴더 | 진입점 | 트랙 |
|---|---|---|
| `game/` | [game/AGENTS.md](game/AGENTS.md) | ① |
| `web/` | [web/AGENTS.md](web/AGENTS.md) | ①②③ 공용 — 경로별 소유표가 그 안에 있다 |
| `content/` | [content/AGENTS.md](content/AGENTS.md) | ③ |
| `pipelines/` | [pipelines/AGENTS.md](pipelines/AGENTS.md) | ③ |

시작 프롬프트에 역할 지정("너는 게임 트랙이다")이 있으면 그 폴더 진입점부터 읽는다.
루트 문서와 폴더 진입점이 어긋나면 **폴더 진입점이 우선**이고, 어긋난 사실을 이재용에게 알린다.

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
  --tool claude --worker 이호연 --task card-engine `
  --path game/src --path game/tests

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
| 폴더 하네스 | `game/` · `web/` · `content/` · `pipelines/` 각각의 `AGENTS.md` ↔ `CLAUDE.md` |
| 스킬 | `.claude/skills/` ↔ `.agents/skills/` |

지키는 방법:

1. **규칙 본문은 항상 `AGENTS.md`에 쓴다.** Codex가 읽는 파일이다.
2. **`CLAUDE.md`는 `@AGENTS.md` import 한 줄을 유지한다.** 이 import가 동기화 장치다 —
   import를 지우고 본문을 복사하면 그 순간부터 두 파일이 갈라진다.
3. Claude 전용 내용을 `CLAUDE.md`에 직접 써야 한다면, **같은 커밋에서 `AGENTS.md`에도 동일하게 반영해라.**
4. 하위 폴더에 `AGENTS.md`를 새로 만들면 같은 커밋에서 `@AGENTS.md` 한 줄짜리 `CLAUDE.md`도 만든다.
5. 스킬은 본문을 `.claude/skills/`에 쓰고 `.agents/skills/`로 복사한다. 두 트리는 항상 동일해야 한다.

```powershell
# 스킬 두 벌이 어긋났는지 확인 (차이가 있으면 종료 코드 1)
git diff --no-index .claude\skills .agents\skills

# 폴더 하네스의 CLAUDE.md가 전부 @AGENTS.md 한 줄인지 확인 (아무것도 안 나오면 정상)
Get-ChildItem game,web,content,pipelines -Filter CLAUDE.md | ForEach-Object {
  if ((Get-Content $_.FullName -Raw).Trim() -ne '@AGENTS.md') { "동기화 깨짐: $($_.FullName)" }
}
```

**이 파일들과 기획서는 이재용만 수정한다.** 다른 팀원의 AI는 동기화 갱신을 포함해 어떤 이유로도 편집하지 않는다.

## 검증

자동 훅이 없다. **바꾼 영역의 명령을 직접 돌리고 결과로 보고한다. 추측 금지.**
