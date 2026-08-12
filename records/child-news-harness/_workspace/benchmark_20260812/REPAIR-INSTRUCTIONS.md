# Luna medium 출력 교정 지시서

기존 Luna medium 초안 10건이 자동 계약 검증에 실패했다. 새 내용을 만들지 말고,
동일한 입력과 현재 출력 계약에 맞춰 지정 출력 파일만 한 번 교정한다.

## 읽을 파일

1. `C:\dev\six-opening\.claude\skills\child-news-renderer\references\one-screen-contract.md`
2. 입력: `C:\dev\six-opening\records\child-news-harness\_workspace\benchmark_20260812\sources\01.json`~`10.json`
3. 기존 초안: `C:\dev\six-opening\records\child-news-harness\_workspace\benchmark_20260812\outputs\luna_medium\01.json`~`10.json`

## 반드시 고칠 공통 오류

- 모든 문장은 계약대로 친근한 반말을 쓴다. `~해요`, `~이에요`, `~어요`를 남기지 않는다.
- 첫 문단에는 출처에 실제 등장하는 핵심 용어 하나를 골라 다음 형식의 정의 문장을
  정확히 한 번 넣는다: `"<용어>은/는 쉽게 말해 <일상어 풀이>이야."`
- 뜻풀이 안에는 또 다른 어려운 경제·산업 용어를 넣지 않는다.
- 세 번째 문단의 첫 두 글자는 반드시 `다만`이다.
- 홈 요약은 2문장 이하, 전체 50자 이하다.
- 나머지 분량·출처·안전 규칙도 현재 계약을 모두 지킨다.

## 검증과 저장

각 파일을 고친 직후 다음 명령을 실행한다.

```powershell
node C:\dev\six-opening\.claude\skills\child-news-compare\scripts\validate-one-screen.mjs <출력파일> <입력파일>
```

검증 실패가 남으면 그 오류만 다시 고쳐 해당 파일이 통과하도록 한다.
10건을 모두 검사한 뒤 같은 출력 폴더에 `manifest.json`을 저장한다.
라벨은 `luna_medium`, 모델은 `gpt-5.6-luna`, 파일별 `valid`와 `errors`를 기록한다.
출력 폴더 밖의 파일은 수정하지 않는다. 웹이나 외부 지식은 사용하지 않는다.

완료 응답에는 생성 10건 중 검증 통과 수와 실패 파일명만 적는다.
