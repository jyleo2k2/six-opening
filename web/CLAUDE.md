# web rules

- UI uses only the tokens and components in `../docs/디자인시스템.md`. Do not add arbitrary hex values or duplicate shared components.
- Import from `shared/` only. Changes within it follow `shared/AGENTS.md`.
- Use fixtures first. LLM access is server-only through `shared/llm` using `@google/genai`; external data passes only through `app/api/quote`, never direct client calls or `NEXT_PUBLIC_*` keys.
- Filter all LLM output. Numeric and scoring calculations use only `shared/engine`.
- Completion requires `npm run build`, the applicable golden-path check, and zero design-system violations.
