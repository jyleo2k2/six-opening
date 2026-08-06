# pipelines — 배치 데이터 파이프라인 세션 하네스

> 적용 범위: `pipelines/` 하위 전체 (`close_snapshot/` 전일 종가 · `news_digest/` 뉴스 재작성).
> 규칙 본문은 이 파일에만 쓴다. 같은 폴더 `CLAUDE.md`는 `@AGENTS.md` 한 줄이다 (루트 `AGENTS.md` §동기화).
> 최종 갱신: 2026-08-06

## 담당 오너

**김경렬·강소정** (트랙 ③). 다만 `close_snapshot/`의 산출물은 `game/data/cards.ts`의 `basePrice`라서
**카드 가격을 실제로 갱신할 때는 트랙 ①(이재용·이호연) 합의가 필요하다** — 밸런스 시뮬 결과가 바뀐다.

## 세션 시작 규칙

1. 루트 `AGENTS.md` → `pipelines/README.md`(디렉터리 정의) → 이 파일 순서로 읽는다.
2. 루트 `C:\dev\six-opening`에서 고치지 않는다. `git_session_manager.py start`로 워크트리를 받아 거기서 작업한다.
3. 산출물 경로(`game/data/` · `content/`)를 같은 세션에서 함께 고치지 않는다. claim을 나누고 PR을 분리한다.

## 불변식

- **게임 런타임에 개입하지 않는다.** 배치로 데이터를 만들어 넣기만 한다. 게임은 외부 API를 실시간 호출하지 않고 데이터 파일만 읽는다 — 장애·레이트리밋·응답지연이 대전 중에 영향을 주면 안 된다.
- **시연 단계에서는 실행하지 않는다.** `game/data`의 고정 스냅샷을 그대로 쓴다.
- **뉴스 원문을 크롤링·전재하지 않는다.** 저작권 문제이며, 아동 대상이라 검수 단계를 건너뛸 수 있게 만들어서도 안 된다.
- **`news_digest`는 발행하지 않는다.** LLM 재작성 결과는 사람 검수 대기 상태로만 내놓는다. 검수를 자동화·생략하는 플래그를 추가하지 않는다.
- Python은 **`uv run python`** 으로만 실행한다. 단독 `python` 호출 금지.
- 수집 결과는 요청 파라미터·기준일·출처를 함께 남긴다. 어디서 온 숫자인지 추적되지 않는 데이터를 `game/data`에 넣지 않는다.
- 시크릿(API 키)은 읽어서 출력·커밋하지 않는다.

## 검증 명령

아직 Python 코드가 없다 (`README.md`만 존재, `pyproject.toml` 미생성).
첫 모듈을 추가하는 세션이 `uv` 프로젝트를 초기화하고 이 절을 실제 명령으로 채운다.

```powershell
uv run python -m close_snapshot   # 예정
uv run python -m news_digest      # 예정
```

`game/data`를 갱신했으면 트랙 ①의 검증까지 돌리고 결과를 PR에 붙인다.

```powershell
npm run test -w game
npm run sim -w game -- 5000
```
