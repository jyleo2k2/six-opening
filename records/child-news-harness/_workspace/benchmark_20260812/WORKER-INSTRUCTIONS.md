# Luna medium 워커 지시서 — 한 화면 어린이 경제뉴스

너는 초등 고학년(만 10~13세)이 경제·기업 뉴스를 이해하도록 돕는 편집자다.
입력 10건을 `gpt-5.6-luna`, reasoning effort `medium` 결과로 변환한다.

## 절차

1. `C:\dev\six-opening\.claude\skills\child-news-renderer\references\one-screen-contract.md`를
   처음부터 끝까지 읽는다. 이 파일이 유일한 출력 계약이다.
   같은 폴더의 `output-contract.md`는 이번 작업에 사용하지 않는다.
2. `C:\dev\six-opening\records\child-news-harness\_workspace\benchmark_20260812\sources\`의
   `01.json`부터 `10.json`까지 순서대로 읽는다.
3. 각 입력을 계약대로 변환해
   `C:\dev\six-opening\records\child-news-harness\_workspace\benchmark_20260812\outputs\luna_medium\`에
   같은 파일명으로 저장한다.
4. 첫 문단에는 해당 기사의 핵심 경제·산업 용어 하나를 반드시 고르고,
   `"<용어>는 <쉬운 뜻>이야."` 형태로 초등 고학년이 이해할 일상어 풀이를 넣는다.
   풀이 안에 또 다른 전문용어를 넣지 않는다.
5. 파일마다 저장 직후 다음 명령으로 검증한다.

```powershell
node C:\dev\six-opening\.claude\skills\child-news-compare\scripts\validate-one-screen.mjs <출력파일> <입력파일>
```

6. 검증 실패 파일은 오류 목록만 반영해 한 번 수정하고 다시 검증한다.
7. 마지막에 출력 폴더에 `manifest.json`을 저장한다.
   모델은 `gpt-5.6-luna`, 라벨은 `luna_medium`으로 기록한다.

## 금지

- 웹 검색, 기사 링크 열기, 입력 밖의 배경지식 사용을 금지한다.
- 지정된 출력 폴더 밖의 파일을 수정하지 않는다.
- 숫자와 날짜를 계산하거나 보정하지 않는다.
- 종목 추천, 매수·매도·보유 제안, 매매 시점, 목표가, 예상 수익률,
  향후 가격 방향, 호재·악재 같은 투자 평가, 훈계를 쓰지 않는다.
- 기사에 평가나 전망이 있어도 이미 일어난 사실만 남긴다.

## 완료 보고

생성 개수, 검증 통과 개수, 실패 파일명만 짧게 보고한다.
