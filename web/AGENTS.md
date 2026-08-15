# web rules

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- 기능 작업은 가장 가까운 기능 가드가 가리키는 `SPEC.md`를 단일 명세로 사용한다. 관련 없는 전역 문서는 기본으로 읽지 않는다.
- UI uses only the tokens and components in `../docs/디자인시스템.md`. Do not add arbitrary hex values or duplicate shared components.
- Import from `shared/` only. Changes within it follow `shared/AGENTS.md`.
- Use fixtures first. LLM access is server-only through `shared/llm` using the `openai` Responses API; external data passes only through `app/api/quote`, never direct client calls or `NEXT_PUBLIC_*` keys.
- Filter all LLM output. Numeric and scoring calculations use only `shared/engine`.
- **화면 원본은 `web/ui-src`다. `public/ui/app.html`은 `scripts/ui-build.mjs`가 만드는 생성물이므로 직접 수정·커밋하지 않는다.** git이 추적하지 않으며 `npm run dev`·`npm test`·`npm run build`가 시작 전에 자동으로 조립한다. 화면 작업은 `web/ui-src` 경로로 claim한다.
- 화면을 고칠 때는 `web/ui-src`의 해당 조각을 고치고 `npm run ui:build`(또는 작업 중 `npm run ui:watch`)로 합친다. `app.html`을 직접 고치면 다음 조립 때 사라진다 — 실제로 그렇게 홈 화면이 통째로 유실됐다(복구 이력: PR #180·#186·#187).
- `ui-build.mjs split`은 방향이 반대라 `ui-src`를 통째로 덮어쓴다. 복구·외부 반입 전용이며 `--force` 없이는 거부된다.
- Completion requires `npm run build`, the applicable golden-path check, and zero design-system violations.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
