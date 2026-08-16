# f3-reason — 매매 기록 폼

- 이 디렉터리의 `AGENTS.md`와 `CLAUDE.md`는 한 쌍이다. 둘 중 하나를 수정하면 같은 작업에서 짝 파일도 동일하게 수정하고 완료 전 비교한다.
- F2·F3 단일 스펙은 `web/features/f2-trade/SPEC.md`다. 이 폴더는 현재 가드만 있고 런타임 컴포넌트나 export가 없다.
- 실제 질문식 기록 폼은 `web/features/f0-home/OrderScreen.tsx`의 매수·매도 단계 안에 있다(iframe 철거 전에는 `app.html`이었다). 명시적인 이관 작업 없이 빈 폴더에 두 번째 폼이나 저장소를 만들지 않는다.
- 이유·보유계획 문구의 원본은 `web/shared/data/trade-copy.js` 하나다(`REASONS`·`SELL_REASONS`·`PLANS`·`CHANGES`). 주문 화면과 아카이브 피드가 같은 코드를 읽으므로 문구를 다른 곳에 다시 적지 않는다.
- 현재 매수는 이유 6개와 보유계획 4개(사용자가 정한 목표가격 계획 포함)가 필수이고, 매도는 이유 6개가 필수다. 확신도는 화면·기록·DB에 없다.
- 즉시 기록은 `localStorage["kw_proto_v1"]`의 `records`·`sellRecords`가 소유하며 F9 아카이브 화면이 그대로 읽는다. 서버 정본은 `/api/trade`가 남기는 `transactions`다.
- 시험·점수·정답처럼 표현하지 않는다.
- 완료: `OrderScreen` 실제 흐름과 `SPEC.md` 계약 일치 + 관련 테스트 + `npm run build`.
