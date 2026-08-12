---
name: git-session-manager
description: six-opening의 병렬 Claude·Codex·6인 개발 작업을 전용 브랜치·worktree·claim·Draft PR로 격리하고 충돌을 차단한다. 코드나 문서를 수정하거나, 새 작업을 시작·재개하거나, 브랜치·worktree·PR 충돌을 확인·정리할 때 반드시 먼저 사용한다. 단순 읽기·설명만 하는 요청에는 사용하지 않는다.
---

# Git Session Manager

Node.js 단일 명령으로 병렬 Git 세션을 관리한다. 프로젝트 전역 규칙상 서브에이전트는 사용하지 않으므로 별도 코디네이터 에이전트를 만들지 않는다. Git 상태 변경은 `scripts/git-session-manager.mjs`의 공용 잠금 안에서 직렬 처리한다.

## Phase 0: 현재 상태 확인

1. `node scripts/git-session-manager.mjs status`를 실행한다.
2. `git status --short --branch`와 `git worktree list`를 확인한다.
3. 루트 `main`은 관제 전용이다. 다른 사람의 dirty 파일을 수정·stash·reset·checkout하지 않는다.
4. 현재 worktree에 활성 claim이 있으면 후속 작업으로 판단하고 `heartbeat` 후 계속한다.

## Phase 1: 작업 세션 확보

새 작업은 깨끗한 루트 `main`에서 시작한다.

```powershell
node scripts/git-session-manager.mjs start `
  --ai codex `
  --worker 이재용 `
  --task 챗봇-안전게이트 `
  --path web/features/f10-chatbot `
  --path web/app/api/chat
```

기존 규칙 worktree를 등록하거나 범위를 넓힐 때는 해당 worktree에서 claim한다.

```powershell
node scripts/git-session-manager.mjs claim `
  --ai codex `
  --worker 이재용 `
  --path web/shared/llm
```

- AI는 `codex`·`claude`만 사용한다.
- 작업자는 `이재용`·`이호연`·`김설빈`·`강소정`·`박혜준`·`김경렬`만 사용한다.
- 작업명은 한글 낱말과 단어 사이 하이픈만 사용한다.
- 브랜치와 worktree 마지막 세 경로는 정확히 같아야 한다.

## Phase 2: 충돌 예방

1. 파일을 수정하기 전에 예상 경로를 모두 claim한다.
2. 활성 로컬 claim 또는 열린 PR과 경로가 겹치면 작업을 시작하지 않는다.
3. 범위가 겹치면 신규 모듈과 공용 연결을 분리하거나 기존 작업을 먼저 끝낸다.
4. `web/app`, `web/shared`, 패키지 파일, 루트 가드, 제품·기술 기준 문서는 공유 핫스팟으로 본다.
5. 루트 가드와 제품·기술 기준 문서는 이재용 세션만 수정한다.
6. 세부 소유권과 병합 순서는 [team-git-policy.md](references/team-git-policy.md)를 따른다.

## Phase 3: 구현과 PR

1. claim 범위 안에서만 수정한다. 범위가 늘면 먼저 `claim`을 다시 실행한다.
2. 기능 작업은 가장 가까운 `AGENTS.md`와 해당 `SPEC.md`를 먼저 읽는다.
3. 첫 의미 있는 커밋을 push한 직후 Draft PR을 연다.
4. PR 본문에 작업자, claim 범위, 공유 핫스팟, 계약 변경, 검증 결과를 기록한다.
5. Ready 전에는 최신 `main`을 반영하고 해당 골든 패스와 `web`의 테스트·빌드를 실행한다.
6. 장시간 작업은 `node scripts/git-session-manager.mjs heartbeat`로 갱신한다.

## Phase 4: 종료

1. PR을 병합하고 worktree가 깨끗한지 확인한다.
2. `node scripts/git-session-manager.mjs release`로 claim을 해제한다.
3. release는 파일·브랜치·worktree를 삭제하지 않는다.
4. 병합 여부, `origin/main` 조상 여부, clean 상태를 확인한 뒤에만 안전 정리한다.

## 검증 명령

```powershell
node --test scripts/git-session-manager.test.mjs
node scripts/git-session-manager.mjs check-guards
node scripts/git-session-manager.mjs guard
cd web
npm test
npm run build
```

`start`와 `claim`이 Git 훅을 자동 활성화한다. 설정을 복구할 때만 다음 명령을 직접 실행한다.

```powershell
node scripts/git-session-manager.mjs install-hooks
```

## 에러 처리

- `main` 수정 차단: 새 전용 세션을 만든다.
- 브랜치·worktree 불일치: 최신 `origin/main`에서 올바른 경로로 새 세션을 만든다.
- claim 겹침: 기존 작업과 경로를 분리하거나 기존 claim을 release한다.
- GitHub 조회 실패: 로컬 claim만 유지하되 Draft PR을 열기 전에 열린 PR 파일을 수동 확인한다.
- 잠금 충돌: 병렬로 재시도하지 않고 현재 Git 관리 명령이 끝난 뒤 다시 실행한다.
- dirty worktree: 강제 삭제·reset하지 않고 남은 파일을 정확히 보고한다.

## 테스트 시나리오

스킬 자동 선택 경계는 [trigger-cases.md](references/trigger-cases.md)의 실행 10건·비실행 10건으로 검토한다.

### 정상 흐름

`codex/이호연/챗봇-질문분류` 세션이 `web/features/f10-chatbot`을 claim하고 구현·검증 후 Draft PR을 연다. 공용 API 연결이 필요하면 먼저 claim을 확장하고 충돌이 없을 때만 수정한다.

### 충돌 흐름

다른 세션이 이미 `web/shared/llm`을 claim했다면 두 번째 세션을 차단한다. 기능 폴더 작업과 공용 필터 연결을 별도 PR로 나누고 공용 변경은 한 작업자만 수행한다.
