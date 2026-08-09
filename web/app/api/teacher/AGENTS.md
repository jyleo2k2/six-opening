# app/api/teacher — 선생님 스트리밍 핸들러 (소유: f7 담당)

- `web/app/` 전체는 오케스트레이터 소유지만 **이 폴더만 예외로 f7-teacher 담당이 수정**한다 (스트리밍 route handler는 여기 있어야 해서).
- 규칙은 `web/features/f7-teacher/AGENTS.md`를 따른다: 모델 `claude-sonnet-5`, 스트리밍 필수, 시스템 프롬프트 원칙("사라/팔아라" 금지·되물음·키웅이·반말), 응답 필터+로깅.
- API 키는 서버 환경변수에서만. 다른 api/ 폴더는 건드리지 않는다.
