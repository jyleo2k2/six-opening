# six-opening 병렬 Git 정책

## 핵심 원칙

- 루트 `main` worktree는 관제·감사·새 세션 생성 전용이다.
- 한 작업은 브랜치·worktree·claim·PR을 각각 하나만 사용한다.
- 병합된 브랜치는 재사용하지 않고 최신 `origin/main`에서 새 작업을 시작한다.
- 다른 작업자의 dirty 파일은 수정·stash·reset·checkout하지 않는다.
- Git 브랜치·worktree·claim 생성과 해제는 세션 관리기의 잠금으로 직렬화한다.

## 브랜치와 worktree

브랜치 형식은 `<사용AI>/<작업자>/<한글-작업명>`이다.

- 사용AI: `codex`, `claude`
- 작업자: `이재용`, `이호연`, `김설빈`, `강소정`, `박혜준`, `김경렬`
- 작업명: `^[가-힣]+(?:-[가-힣]+)*$`
- 예: `codex/이재용/챗봇-안전게이트`
- worktree: `../six-opening-worktrees/codex/이재용/챗봇-안전게이트`

## 기능 소유권

- `web/features/f2-trade`와 `web/features/f3-reason`: F2·F3 `SPEC.md` 기준으로 함께 조율한다.
- `web/features/f9-archive`: F9 작업자가 독립 작업할 수 있다.
- `web/features/f10-chatbot`: F10 작업자가 독립 작업할 수 있다.
- `web/app`: 라우팅·Route Handler 연결 담당자 한 명만 수정한다.
- `web/shared`: 공용 계약·엔진·LLM·스토어 연결 담당자 한 명만 수정한다.
- 기능 작업자는 공용 구현을 복제하지 않고 공용 담당자에게 연결 작업을 넘긴다.

## 공유 핫스팟

다음 경로는 동시에 한 작업만 수정한다.

- 루트 `AGENTS.md`, `CLAUDE.md`, `.gitignore`
- `web/app`
- `web/shared`
- `web/package.json`, `web/package-lock.json`
- `docs/영웅키움_기획_통합문서_v2.md`
- `docs/기술스택.md`, `docs/디자인시스템.md`
- 각 기능의 `SPEC.md`

루트 가드와 제품·기술 기준 문서는 이재용 세션만 수정한다.

## 계약 변경 순서

여러 영역이 연결되면 다음 순서로 처리한다.

1. 해당 기능 `SPEC.md`와 공용 타입 계약
2. 값을 만드는 생산자 구현
3. 값을 사용하는 소비자 구현
4. `web/app`의 라우팅·API 통합 연결
5. 전체 테스트와 빌드

작업자가 한 명이고 모든 경로를 claim했다면 하나의 PR로 처리할 수 있다. 여러 명이 나누면 계약 PR을 먼저 병합한다.

## PR 규칙

- 첫 의미 있는 커밋 직후 Draft PR을 연다.
- base는 `main`만 사용하고 병합된 기능 브랜치를 base로 한 stacked PR은 만들지 않는다.
- PR 본문에 사용AI·작업자·작업명·claim 범위·핫스팟·계약 변경·검증을 기록한다.
- Ready 전 최신 `main`을 반영하고 관련 테스트와 `npm run build`를 실행한다.
- 충돌 해결은 PR 브랜치 소유자 또는 이재용이 담당한다.
- 병합 후 claim을 release한 다음 안전 검사를 거쳐 로컬 브랜치와 worktree를 정리한다.

## Next.js worktree 실행

- worktree마다 `web/node_modules`와 `web/.next`를 독립적으로 사용한다.
- 새 worktree의 `web`에서 `npm ci`를 실행한다.
- 세션 관리기가 배정한 3100~3199 포트로 `npm run dev -- -p <포트>`를 실행한다.
- `.env`와 키는 자동 복사·출력·커밋하지 않는다. 필요한 경우 작업자가 로컬에서 안전하게 준비한다.
