# 키움 가족 모의투자 리그 — KDA 발표 프로젝트

부모·자녀가 각자 모의투자하고 AI가 생각을 연결하는 가족형 리그. 데모 웹앱 + 발표 자료를 만든다.

## 세션 시작 시

1. `기능명세.md` 읽기 (기능 ID F0~F4·F7, 골든 패스)
2. 코드 작업이면 **작업 폴더의 가드 파일이 네 규칙이다** — `web/` 이하 모든 소유 경계 폴더에 `AGENTS.md`(본문)+`CLAUDE.md`(@임포트) 쌍이 있다. 전체 지도: `docs/하네스.md`
3. UI 작업이면 `docs/디자인시스템.md` 필독 (토큰 8색·컴포넌트 10종·말투 — 강제)
4. 기획 판단이 필요하면 `기획서.md` v4가 유일한 진실 원천

## 핵심 규칙 요약

- 문서 우선순위: 기획서 > 기능명세 > 디자인시스템 > 기술스택·가드 파일 (충돌 시)
- 기능 에이전트는 자기 `features/f*` 폴더 안에서만 쓴다. `shared/`는 import 전용 — 변경은 `web/shared/AGENTS.md` 요청 로그 절차
- LLM 출력은 반드시 `shared/llm` 필터 경유. AI가 종목 추천·목표가·수익률 전망을 말하면 버그
- [사실]/[추론]/[가정] 표기를 발췌 시 떼지 말 것
- 팀 원본 `키움_가족모의투자_팀공유_정리_v2.md`는 수정 금지 (보존)
- md가 원본, `자료정리.html`은 뷰 — 기획 변경 시 md 먼저

## 스택 (docs/기술스택.md)

Next.js(App Router)+TS+Tailwind, `web/` 하위 feature-sliced. LLM 기능별: F1·F4=claude-opus-5(품질), F7 선생님=claude-sonnet-5(스트리밍 지연) — 전부 서버 경유. 시세=KIS 실시간+폴백 캐시. 상태=zustand. 픽스처 우선 개발.

## 명령어·위임

- 개발 `npm run dev` / 검증 `npm run build` / 배포 Vercel
- 서브에이전트: paseo `create_agent`, provider `codex/gpt-5.6-sol|luna`, thinking `xhigh`. 위임 프롬프트에 담당 폴더 경로 명시 ("그 폴더의 AGENTS.md가 네 규칙") — `docs/하네스.md` §위임
