<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 물려주는 계좌 — 영웅문 주니어

기획안: `../물려주는계좌_기획안.md` — 제품 결정은 전부 거기가 근거다.

## AGENTS.md ↔ CLAUDE.md 동기화 (필수)

**`web/AGENTS.md`를 고치면 `web/CLAUDE.md`도 같은 커밋에서 함께 확인·수정해라.** 루트의 `AGENTS.md` ↔ `CLAUDE.md` 쌍도 마찬가지다.

- 규칙 본문은 항상 `AGENTS.md`에 쓴다 (Codex가 읽는 파일).
- `CLAUDE.md`는 `@AGENTS.md` import 한 줄을 유지한다 — 이 import가 동기화 장치다. 지우고 본문을 복사하면 그때부터 갈라진다.
- Claude 전용 내용을 `CLAUDE.md`에 직접 써야 한다면, 같은 커밋에서 `AGENTS.md`에도 동일하게 반영한다.
- 앱 규칙을 바꿔 루트 설명이 어긋나면 루트 `AGENTS.md`도 같이 고친다.

## 절대 만들지 말 것

이 서비스는 "안 넣은 것"을 논문으로 방어하는 것이 발표의 핵심이다. 아래를 추가하면 프로젝트의 논리가 무너진다.

- **랭킹 · 배지 · XP · 포인트 · 레벨업 · 연속접속 보상 · 보물상자** — 거래 유도형 게이미피케이션(Chapkovski et al., *Management Science* 2026)
- **수익률 비교 · 순위** — 아이가 지면 상처받는다. 성향 리포트는 보유기간·근거 유형으로만 비교한다
- **화이트리스트 밖 종목** — 레버리지·인버스·테마주 금지
- **"1개월 이내" 같은 단타 선택지** — 최소 보유 90일 규칙과 정면충돌
- **아이에게 나가는 텍스트를 런타임 LLM으로 생성** — 미성년 대상 투자권유 리스크. 종목 카피는 `lib/stocks.ts`의 검수 고정문만 쓴다
- **별도 가상 세계 · 가상 자산 게임** — 예습 모드는 1화면을 넘기지 않는다

## 반드시 지킬 것

- **제안서 Q1은 자유서술이 기본이다.** 추천 버튼은 서술칸을 *채우고 사라지는* 마중물이고, 버튼을 눌러도 코치가 1회 되묻는다. `label`만 저장되면 이 프로젝트의 데이터 전략이 죽는다 (기획안 3-3, 8장)
- **반려 사유 입력은 스킵 불가.** 서버가 422로 막는다 (`lib/rules.ts` `checkReason`)
- **코치는 정답을 주지 않는다.** 되묻기 1회, "몰라"도 통과 (`lib/llm.ts`)
- 아이 화면의 1순위 CTA는 **"내가 쓴 이유 다시 보기"**. 수익률은 2순위

## 구조

```
lib/types.ts    프론트·백엔드 공유 계약. 응답 모양을 바꾸면 여기부터
lib/rules.ts    안전장치를 코드로. 라우트는 여기만 호출한다
lib/stocks.ts   화이트리스트 + 검수 카피(런타임 LLM 없음)
lib/kiwoom.ts   키움 REST(모의투자). 상수는 키움 문서로 대조 확인 필요
lib/llm.ts      제안서 코치 — 이 프로젝트의 유일한 실시간 LLM
app/api/...     Route Handlers
```

- 화면은 전부 `"use client"`로 두고 Route Handlers만 서버로 쓴다.
- 모션은 `motion`, 바텀시트는 `vaul`, 토스트는 `sonner`.
- DB는 Node 내장 `node:sqlite`. ORM 쓰지 않는다.

## 검증

```
npm run typecheck   # next typegen + tsc --noEmit
npm run test        # 안전장치 규칙 단위 테스트 (10건)
npm run verify      # 기획안 조항 검증 30건 — 별도 터미널에 npm run dev 필요
```

`scripts/verify.ts`가 기획안 v2.0의 조항을 실행 가능한 형태로 담고 있다.
**기능을 추가하면 여기 체크를 먼저 추가하고, 그 다음에 구현해라.** 하나라도 실패하면 exit 1이다.

검증 범위: 백엔드 + 계약. 화면 21개와 키움 상수 대조는 여기서 못 잡는다.
