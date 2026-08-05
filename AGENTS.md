# 물려주는 계좌 — 영웅문 주니어

키움증권 KDA 프로젝트. **이미 열려 있는 미성년 계좌를 아이의 교재로 바꾸는** 서비스다.

| 경로 | 내용 |
|---|---|
| `물려주는계좌_기획안.md` | **기획안 v2.0. 모든 제품 결정의 근거는 여기다.** |
| `web/` | Next.js 앱 (아이 앱 + 영웅문 내 부모 메뉴). 앱 규칙은 `web/AGENTS.md` |
| `prototype/step1-input.html` | 제안서 입력 방식 A/B 비교 프로토타입 |

## AGENTS.md ↔ CLAUDE.md 동기화 (필수)

에이전트 지침 파일이 두 벌씩 있다. **하나를 고치면 반드시 다른 하나도 같은 커밋에서 고쳐라.**
한쪽만 바꾸면 Codex와 Claude Code가 서로 다른 규칙으로 움직인다.

| 쌍 | 파일 |
|---|---|
| 루트 | `AGENTS.md` ↔ `CLAUDE.md` |
| 앱 | `web/AGENTS.md` ↔ `web/CLAUDE.md` |

지키는 방법:

1. **규칙 본문은 항상 `AGENTS.md`에 쓴다.** Codex가 읽는 파일이다.
2. **`CLAUDE.md`는 `@AGENTS.md` import 한 줄을 유지한다.** 이 import가 동기화 장치다 —
   import를 지우고 본문을 복사하면 그 순간부터 두 파일이 갈라진다.
3. Claude 전용 내용을 `CLAUDE.md`에 직접 써야 한다면, **같은 커밋에서 `AGENTS.md`에도 동일하게 반영해라.**
4. 앱 규칙을 고쳤는데 루트 설명이 어긋나면 루트도 같이 고친다.

## 시작하기

```
cd web
npm install
cp .env.example .env.local   # 키움 모의투자 키 · ANTHROPIC_API_KEY
npm run dev
```

## 검증

```
cd web
npm run typecheck   # next typegen + tsc --noEmit
npm run test        # 안전장치 규칙 단위 테스트
npm run verify      # 기획안 조항 검증 30건 (별도 터미널에 npm run dev 필요)
```

`web/scripts/verify.ts`가 기획안 v2.0의 조항을 실행 가능한 형태로 담고 있다.
**기능을 추가할 땐 체크를 먼저 쓰고 구현해라.**
