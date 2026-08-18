# 지정 링크 뉴스 적재 경로

대표님이 종목마다 기사 링크를 하나씩 지정해 주면, 그 기사를 읽어 4역할 파이프라인에
태우고 통과한 것만 DB 에 넣는 경로다. 판정 기준은 바꾸지 않는다 — 링크를 사람이 골랐다는
사실은 "이 기사를 검토하라"는 뜻이지 "이 기사를 통과시키라"는 뜻이 아니다.

옆 폴더의 `collect-universe-news.ts` 와 다른 점은 둘이다.

- **찾지 않는다.** 네이버 검색으로 후보를 고르는 절반이 통째로 없다.
- **물러설 곳이 없다.** 종목마다 기사가 하나뿐이라 거부되면 과거 기사 폴백이 없다.
  그 종목은 신규 카드를 만들지 않는다.

기존에 게시된 뉴스는 지우지 않는다(2026-08-18 대표님 결정). `/api/news` 가 종목별 최신
10건 중 하나를 무작위로 고르므로 기존 카드와 신규 카드가 번갈아 나온다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `supplied-links.tsv` | 입력. `종목코드<TAB>기사 URL` 한 줄에 하나 |
| `link-article-parser.ts` | 기사 페이지에서 제목·언론사·발행시각·본문 문장을 읽는 순수 함수 |
| `link-article-parser.test.ts` | 실측 48건에서 걸린 예외를 굳힌 회귀 테스트 |
| `collect-link-news.ts` | 링크를 읽어 파이프라인 입력 JSON 으로 만든다 |
| `run-link-pipeline.ts` | 4역할을 모두 `max` 추론으로 돌려 종목별 판정을 만든다 |
| `render-review-html.ts` | 기존(왼쪽·중앙) 대 신규(오른쪽) 검수 화면을 만든다 |
| `load-link-news.ts` | 통과분만 PostgREST 로 적재한다 |

## 기사 페이지를 읽는 규칙

30여 개 언론사가 섞여 있어 네이버 기사 하나만 읽던 방식(`dic_area`·`data-date-time`)을
쓸 수 없다. 대신 어느 매체에나 있는 것만 본다.

- 제목·언론사: `og:title` · `og:site_name`
- 발행시각: `article:published_time` → JSON-LD `datePublished`
- 본문: 본문 컨테이너를 **닫는 태그까지 정확히 잘라** 문장으로 나눈다

본문 규칙만 긴 이유가 있다. 처음에는 여는 태그부터 고정 길이로 잘랐더니 관련기사 목록과
인라인 스크립트가 근거 문장으로 딸려 왔다(KBS 807문장, 뉴시스 171문장). 근거가 오염되면
편집자가 그 기사에 없는 사실을 쓴다.

실측 48건에서 걸린 예외도 파서가 함께 처리한다.

| 증상 | 매체 | 처리 |
|---|---|---|
| 본문이 `Fusion.globalContent` JSON 안에만 있음 | 조선비즈 | Arc 전용 경로를 먼저 본다 |
| JSON-LD 안에 `//` 주석이 섞여 파싱 실패 | KBS | 주석을 지우고 다시 파싱한다 |
| 스크립트 안 `<div>` 문자열 때문에 태그 짝이 깨짐 | 뉴스1 | 스캔 전에 스크립트를 공백으로 지운다 |
| 본문을 브라우저에서 그려 서버 HTML 에 없음 | 뉴스1 | 언론사가 준 AMP 판을 한 번 더 읽는다 |
| 본문 첫 줄이 기사 제목과 같음 | 다수 | 제목과 같은 줄은 근거에서 뺀다 |

AMP 를 읽어도 **저장하는 원문 주소는 늘 대표님이 주신 링크**다. AMP 는 읽기용일 뿐이다.

## 실행

```powershell
cd web

# 1. 링크를 읽어 파이프라인 입력을 만든다
node features/f2-trade/prototypes/child-news-role-pipeline/link-news/collect-link-news.cjs `
  --run-id supplied-link-news-2026-08-18 --overwrite

# 2. 4역할 판정. 종목끼리 의존이 없어 동시에 여러 개 돌린다
node features/f2-trade/prototypes/child-news-role-pipeline/link-news/run-link-pipeline.cjs `
  --input features/f2-trade/prototypes/child-news-role-pipeline/evaluation-fixtures/supplied-link-news-2026-08-18.json `
  --output features/f2-trade/prototypes/child-news-role-pipeline/reports/supplied-link-news-2026-08-18 `
  --overwrite --concurrency 5

# 중단되면 이어서. 기술 오류만 다시 돌리려면 --retry-technical-errors 를 더한다
#   ... --resume --retry-technical-errors --role-timeout-ms 600000

# 3. 검수 화면 (기존 왼쪽·중앙 / 신규 오른쪽)
node features/f2-trade/prototypes/child-news-role-pipeline/link-news/render-review-html.cjs `
  --report features/f2-trade/prototypes/child-news-role-pipeline/reports/supplied-link-news-2026-08-18/report.json

# 4. 대표님 승인 후 적재. 먼저 --dry-run 으로 문안을 확인한다
node features/f2-trade/prototypes/child-news-role-pipeline/link-news/load-link-news.cjs `
  --report features/f2-trade/prototypes/child-news-role-pipeline/reports/supplied-link-news-2026-08-18/report.json `
  --dry-run

# 5. 적재 뒤 전수 검사와 복구본 갱신
npm run news:audit
npm run seed:news:export
```

`reports/` 는 커밋하지 않는다(`../.gitignore`). 검수 화면은 로컬에서 열어 본다.

## 적재가 지키는 것

- 통과(`ready_for_storage`)만 넣는다. 거부는 서비스 카드를 만들지 않는다.
- 트랜잭션이 아니므로 기사 단위로 넣고, 같은 `source_key`(원문 URL 해시)는 건너뛴다.
  한 기사 안에서 실패하면 그 기사만 지우고 멈춘다.
- 게시물이 `ready_for_storage` 이상이면 근거·인용을 **새로 넣지도** 못한다(출고 불변성
  트리거). 그래서 게시물을 `draft` 로 먼저 세우고 증거를 채운 뒤 마지막에 상태를 올린다.
- 선별자가 문장을 쪼개면 근거 id 가 `S3.2` 가 되는데 DB 는 점을 받지 않는다.
  `universe-news-storage.ts` 와 같은 규칙으로 `S3_2` 로 바꿔 넣는다.
