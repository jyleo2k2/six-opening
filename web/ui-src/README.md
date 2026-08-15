# ui-src — 화면 원본

`web/public/ui/app.html` 은 여기서 조립한 **생성물**이다. git 이 추적하지 않고
`npm run dev`·`npm test`·`npm run build` 가 시작 전에 만든다. `app.html` 을 직접 고치면
다음 조립 때 사라진다.

```
npm run ui:build    # 한 번 조립
npm run ui:watch    # ui-src 를 고치는 동안 자동 재조립
```

## 조립 방식

`manifest.json` 의 `files` 순서대로 **그대로 이어 붙인다.** 그래서 조각 하나를 여러 파일로
나눠도 순서만 지키면 결과가 바이트 단위로 같다. 반대로 파일 순서를 바꾸면 화면이 깨진다.

조각은 각자 완결된 파일이 아니라 **큰 문서·큰 객체의 일부**다. 예를 들어
`methods/renderVals-return-*.js` 는 하나의 `return { ... }` 안을 화면별로 자른 것이라
파일 하나만 떼서 실행할 수 없다. 이어 붙인 뒤에야 문법이 완성된다.

## 폴더

| 폴더 | 내용 |
|---|---|
| `template/` | `shell-*.html` — 화면 사이를 잇는 문서 뼈대. `shell-0.html` 에 `<head>`·런타임 스크립트·폰 프레임이 있다 |
| `screens/` | 화면별 마크업. `sc-if`·`sc-for` 는 `public/ui/support.js` 런타임의 템플릿 문법이다 |
| `methods/` | 컴포넌트 메서드. 이어 붙이면 클래스 본문 하나가 된다 |
| `logic/` | 상수·엔진 등 메서드 바깥 코드 |

### `methods/renderVals-*`

화면이 읽는 표시값을 만드는 곳이고 가장 큰 덩어리였다. 화면별로 나눠 두었다.

| 파일 | 담당 |
|---|---|
| `renderVals-compute.js` | 화면 공통으로 쓰는 지역값 계산 (계정·시세·주문 초안 등) |
| `renderVals-return-0-common.js` | 어떤 화면인지 나타내는 플래그 |
| `renderVals-return-1-home.js` | 홈 + 계좌 요약 |
| `renderVals-return-2-explore.js` | 탐색·종목 상세 |
| `renderVals-return-3-buy.js` | 매수 3단계 |
| `renderVals-return-4-archive.js` | 성장 아카이브 |
| `renderVals-return-5-ranking.js` | 랭킹 |
| `renderVals-return-6-sell.js` | 매도 3단계 |
| `renderVals-return-7-shared.js` | 하단 탭바·스쿨락·차트 등 화면 공용 |

## `split` 은 복구용이다

`ui-build.mjs split --force` 는 방향이 반대라 **`ui-src` 를 통째로 지우고 `app.html` 기준으로
다시 만든다.** 이 폴더 구조와 이 README 도 함께 사라진다. 디자인 툴에서 받은 `app.html` 을
반입하거나 사고를 복구할 때만 쓴다.
