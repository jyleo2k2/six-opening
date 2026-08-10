# 키움 가족 모의투자 리그 — KDA 발표 프로젝트

부모·자녀가 각자 모의투자하고, 가족이 함께 키우는 AI펫이 생각을 이어주는 가족형 리그. 데모 웹앱 + 발표 자료를 만든다.

## 세션 시작 시

1. `docs/기능명세.md` 읽기 (기능 ID F0·F2·F3·F8·F9, 골든 패스)
2. 코드 작업이면 **작업 폴더의 가드 파일이 네 규칙이다** — `web/` 이하 모든 소유 경계 폴더에 `AGENTS.md`(본문)+`CLAUDE.md`(@임포트) 쌍이 있다. 전체 지도: `docs/하네스.md`
3. UI 작업이면 `docs/디자인시스템.md` 필독 (토큰 8색·컴포넌트 10종·말투 — 강제)
4. 기획 판단이 필요하면 `docs/기획서.md` v5가 유일한 진실 원천. AI펫 상세 원안은 `docs/펫서비스기획.md`

## 핵심 규칙 요약

- 문서 우선순위: 기획서 > 기능명세 > 디자인시스템 > 기술스택·가드 파일 (충돌 시)
- 기능 에이전트는 자기 `features/f*` 폴더 안에서만 쓴다. `shared/`는 import 전용 — 변경은 `web/shared/AGENTS.md` 요청 로그 절차
- LLM 출력은 반드시 `shared/llm` 필터 경유. AI가 종목 추천·목표가·수익률 전망·훈계를 말하면 버그
- **펫은 자유 입력 없음** — AI에게 말을 거는 입력 UI 금지. 펫이 먼저 발화, 반응은 선택지. 판단력 채점도 전면 금지
- [사실]/[추론]/[가정] 표기를 발췌 시 떼지 말 것
- 원안 보존 (수정 금지): `docs/키움_가족모의투자_팀공유_정리_v2.md`, `docs/펫서비스기획.md`
- md가 원본, `docs/자료정리.html`은 뷰 — 기획 변경 시 md 먼저

## 스택 (docs/기술스택.md)

Next.js(App Router)+TS+Tailwind, `web/` 하위 feature-sliced. LLM: F8 펫 리액션=claude-sonnet-5(지연), F8 오늘의 순간·주간 질문/F9 성향 서술=claude-opus-5(품질) — 전부 서버 경유, 임계치 트리거 시에만 호출. 시세=키움 REST API+폴백 캐시. 상태=zustand. 픽스처 우선 개발.

## 명령어·위임

- 개발 `npm run dev` / 검증 `npm run build` / 배포 Vercel
- 서브에이전트: paseo `create_agent`, provider `codex/gpt-5.6-sol|luna`, thinking `xhigh`. 위임 프롬프트에 담당 폴더 경로 명시 ("그 폴더의 AGENTS.md가 네 규칙") — `docs/하네스.md` §위임
