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

미성년 대상 서비스라 아래는 타협 대상이 아니다.

- **화이트리스트 밖 종목** — 레버리지·인버스·테마주 금지
- **"1개월 이내" 같은 단타 선택지** — 최소 보유 90일 규칙과 정면충돌
- **아이에게 나가는 텍스트를 런타임 LLM으로 생성** — 미성년 대상 투자권유 리스크. 종목 카피는 `lib/stocks.ts`의 검수 고정문만 쓴다. 실시간 LLM은 사실 주장을 하지 않는 제안서 코치 하나뿐이다
- **아이가 주문을 직접 실행하는 경로** — 미성년자는 법적으로 단독 주문이 불가능하고, 그 제약이 곧 제안-승인 설계의 근거다

> **2026-08-06 삭제**: "랭킹·배지·XP·포인트 금지", "수익률 비교·순위 금지",
> "별도 가상 세계·가상 자산 게임 금지" 세 조항을 뺐다. 전략시뮬게임이 정식 트랙이 되면서
> `game/`에 골드·별점·랭크가 들어간다. 다만 **`web/`(실계좌 앱)에 랭킹을 넣을 이유가 생긴 것은
> 아니다** — 기획안 5장의 "수익률 비교는 하지 않는다. 아이가 지면 상처받는다"는 판단은 그대로다.
> 넣고 싶으면 기획안 5장을 먼저 고치고 오라는 뜻이지, 자유로워졌다는 뜻이 아니다.

## 반드시 지킬 것

- **제안서 Q1은 자유서술이 기본이다.** 추천 버튼은 서술칸을 *채우고 사라지는* 마중물이고, 버튼을 눌러도 코치가 1회 되묻는다. `label`만 저장되면 이 프로젝트의 데이터 전략이 죽는다 (기획안 3-3, 8장)
- **반려 사유 입력은 스킵 불가.** 서버가 422로 막는다 (`lib/rules.ts` `checkReason`)
- **코치는 정답을 주지 않는다.** 되묻기 1회, "몰라"도 통과 (`lib/llm.ts`)
- 아이 화면의 1순위 CTA는 **"내가 쓴 이유 다시 보기"**. 수익률은 2순위

## 구조

```
lib/types.ts    프론트·백엔드 공유 계약. 응답 모양을 바꾸면 여기부터   [핫스팟]
lib/db.ts       스키마                                                [핫스팟]
lib/rules.ts    안전장치를 코드로. 라우트는 여기만 호출한다
lib/stocks.ts   화이트리스트 + 검수 카피(런타임 LLM 없음)
lib/kiwoom.ts   키움 REST(모의투자). 상수는 키움 문서로 대조 확인 필요
lib/llm.ts      제안서 코치 — 이 프로젝트의 유일한 실시간 LLM
lib/news/       뉴스 수집·눈높이 번역·검수 상태
app/api/...     Route Handlers
```

- 화면은 전부 `"use client"`로 두고 Route Handlers만 서버로 쓴다.
- 모션은 `motion`, 바텀시트는 `vaul`, 토스트는 `sonner`.
- DB는 Node 내장 `node:sqlite`. ORM 쓰지 않는다.

## 담당 경계 — 화면을 만들기 전에 읽어라

이 앱은 두 트랙 4명이 함께 쓴다. **화면 21개가 아직 대부분 미구현이라, 경계를 지키지 않으면
같은 파일에서 정면충돌한다.** 라우트 세그먼트가 곧 경계다.

| 경로 | 담당 |
|---|---|
| `app/layout.tsx` · `app/globals.css` · `app/page.tsx` | **핫스팟** — 이재용(통합 오너)만 |
| `app/kid/news/` | 강소정 (뉴스 화면) |
| `app/api/news/` · `lib/news/` | 박혜준 (뉴스 파이프라인) |
| `app/parent/` · `app/api/proposals/` · `app/api/invite/` · `lib/rules.ts` · `lib/kiwoom.ts` | 김설빈 (제안-승인 워크플로) |
| `app/kid/`(news 제외) · `app/api/{coach,classify,stocks,portfolio,preview}/` · `lib/{llm,stocks,holdings}.ts` | 김경렬 (아이 화면) |
| `scripts/verify.ts` | **핫스팟** — 각자 체크를 추가하되 겹치면 이재용이 순서를 정한다 |

- **신규 화면은 자기 세그먼트 안에 파일을 새로 만든다.** `app/layout.tsx`의 내비게이션 연결은
  이재용이 별도 PR로 한다. 직접 붙이지 않는다.
- `lib/types.ts`·`lib/db.ts`를 바꿔야 하면 **계약 PR을 먼저** 올린다.
  계약 → 생산자 구현 → 소비자 구현 → 통합 연결 순으로 병합한다.
- 담당 밖 폴더는 읽기 자유, 수정은 담당자 합의 + PR.

작업 시작 전에 반드시 세션을 claim한다 — 겹치면 세션 생성 자체가 거부된다.

```powershell
uv run python scripts/git_session_manager.py start `
  --tool claude --worker <이름> --task <작업명> --path <경로>
```

## 검증

```
npm run typecheck   # next typegen + tsc --noEmit
npm run test        # 안전장치 규칙 단위 테스트 (10건)
npm run verify      # 기획안 조항 검증 30건 — 별도 터미널에 npm run dev 필요
```

`scripts/verify.ts`가 기획안 v2.0의 조항을 실행 가능한 형태로 담고 있다.
**기능을 추가하면 여기 체크를 먼저 추가하고, 그 다음에 구현해라.** 하나라도 실패하면 exit 1이다.

검증 범위: 백엔드 + 계약. 화면 21개와 키움 상수 대조는 여기서 못 잡는다.
