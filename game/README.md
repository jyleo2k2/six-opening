# 주식 카드 배틀 — 룰 엔진 + 셀프플레이 시뮬레이터

설계 문서: `../docs/game-design.md` (11절 검증 루프가 이 폴더의 존재 이유)

## 실행

```bash
npm test        # 룰 정합성 유닛 테스트 (밸런스 수치와 무관하게 고정 config로 검증)
npm run sim     # 셀프플레이 밸런스 리포트 (기본 1000판/매치)
npm run sim 200 # 판 수 지정
```

## 구조

- `src/types.ts` — 상태·카드·설정 타입
- `src/cards.ts` — MVP 카드 15종, 기본 덱 22장, 실명 종목 4개, 월드 이벤트(실제 역사 사건 기반)
- `src/engine.ts` — 헤드리스 룰 엔진 (턴 진행, 카드 효과, 정산, 승패). `DEFAULT_CONFIG`가 현행 밸런스 수치
- `src/bots.ts` — 봇 7종: greedy(기준) / turtle(현금홀딩) / yolo(몰빵) / diversify(분산) / illegal(불법스팸) / signal(예고 활용) / shark(어그로 킬덱)
- `src/simulate.ts` — 매치업 돌려서 승률·승리사유·자산분포·카드 기여도 리포트

## 밸런스 루프

수치를 바꾸면: `npm test` (룰 안 깨졌나) → `npm run sim` (목표 지표 확인) → `docs/game-design.md` 11절 스냅샷 갱신.
