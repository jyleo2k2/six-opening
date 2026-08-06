# pipelines — Python (uv)

게임 런타임에는 개입하지 않는다. 배치로 데이터를 만들어 넣기만 한다.

| 디렉터리 | 하는 일 | 산출물 |
|---|---|---|
| `close_snapshot/` | 장 마감 후 전일 종가 수집 | `game/data/cards.ts`의 `basePrice` 갱신 |
| `news_digest/` | 이슈 → Claude API로 아이 눈높이 재작성 → **사람 검수** → 발행 | `content/news/*.mdx` |

## 원칙

- 게임은 외부 API를 실시간으로 호출하지 않는다. DB/데이터 파일만 읽는다.
  장애·레이트리밋·응답지연이 대전 중에 영향을 주면 안 된다.
- 시연 단계에서는 실행하지 않는다. `game/data`의 고정 스냅샷을 그대로 쓴다.
- 뉴스 원문을 크롤링·전재하지 않는다. 저작권 문제이며, 아동 대상이라 검수 단계를
  건너뛸 수 있게 만들어서도 안 된다.

## 실행

```powershell
uv run python -m close_snapshot
uv run python -m news_digest
```
