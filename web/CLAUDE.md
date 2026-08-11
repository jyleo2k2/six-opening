# web rules

- UI uses only the tokens and components in `../docs/디자인시스템.md`. Do not add arbitrary hex values or duplicate shared components.
- Import from `shared/` only. Changes within it follow `shared/AGENTS.md`.
- Use fixtures first. LLM access is server-only through `shared/llm` using the `openai` Responses API; external data passes only through `app/api/quote`, never direct client calls or `NEXT_PUBLIC_*` keys.
- Filter all LLM output. Numeric and scoring calculations use only `shared/engine`.
- Completion requires `npm run build`, the applicable golden-path check, and zero design-system violations.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
