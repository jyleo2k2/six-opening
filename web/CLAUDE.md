# web/ — 앱 규칙

- UI는 `../docs/디자인시스템.md` 토큰·컴포넌트만 사용한다. 임의 hex·공용 컴포넌트 복제 금지.
- `shared/`는 import만 하고 변경은 `shared/AGENTS.md`를 따른다.
- fixtures 우선. LLM은 서버 전용 `@google/genai`를 쓰는 `shared/llm`, 시세는 `app/api/quote`만 거치며 API 키를 클라이언트나 `NEXT_PUBLIC_*`에 넣지 않는다.
- LLM 출력은 필터를 거치고 숫자·판정은 `shared/engine`만 계산한다.
- 완료: `npm run build` + 담당 골든 패스 + 디자인시스템 위반 0.
