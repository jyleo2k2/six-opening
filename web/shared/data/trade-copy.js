// 매수·매도 이유와 보유 계획의 코드·문구. **저장되는 코드의 단일 원본이다.**
//
// 주문 화면(`ui-src`)이 코드를 고르고 `POST /api/trade` 가 그대로 저장하며, 아카이브
// 피드는 그 코드를 다시 문구로 편다. 화면이 옮겨 가는 동안 양쪽이 같은 목록을 봐야 하므로
// 여기 하나만 둔다 — 한쪽만 고치면 저장된 코드를 못 읽는 카드가 생긴다.
//
// 이 파일은 브라우저(`public/ui/app.html`)와 서버·테스트가 함께 쓴다.
// `scripts/ui-build.mjs` 가 `export` 를 떼고 app.html 안으로 복사하므로
// **TypeScript 문법과 import 를 쓰지 않는다.** 고칠 때는 이 파일만 고치고
// `node scripts/ui-build.mjs build` 로 화면을 다시 만든다.

/**
 * @typedef {{ code: string, label: string, short: string }} TradeChoice
 * @typedef {{ code: string, label: string }} ChangeChoice
 */

/** 매수 이유 6개. `label` 은 고르는 화면, `short` 는 기록·피드 문장에 쓴다. */
export const REASONS = [
  { code: 'buy_news', label: '뉴스에서 봐서', short: '뉴스를 보고' },
  { code: 'buy_chart', label: '그래프가 좋아 보여서', short: '그래프를 보고' },
  { code: 'buy_familiar', label: '내가 아는 회사라서', short: '내가 아는 회사라서' },
  { code: 'buy_ranking', label: '인기 순위에서 봐서', short: '인기 순위를 보고' },
  { code: 'buy_social', label: '친구·가족이 말해줘서', short: '친구·가족 말을 듣고' },
  { code: 'buy_intuition', label: '그냥 느낌이 좋아서', short: '느낌이 좋아서' }
];

/** 보유 계획 4개. `plan_target` 만 목표가를 함께 적는다. */
export const PLANS = [
  { code: 'plan_short', label: '이번 주만', short: '이번 주만' },
  { code: 'plan_season', label: '시즌 끝까지', short: '시즌 끝까지' },
  { code: 'plan_target', label: '내가 정한 목표 가격이 되면', short: '목표 가격이 되면' },
  { code: 'plan_none', label: '아직 모르겠어', short: '아직 모르겠지만' }
];

/** 매도 이유 6개. */
export const SELL_REASONS = [
  { code: 'sell_target_hit', label: '목표한 만큼 와서', short: '목표한 만큼 와서' },
  { code: 'sell_plan_time', label: '정한 날짜가 돼서', short: '정한 날짜가 돼서' },
  { code: 'sell_rebalance', label: '더 좋아 보이는 회사를 찾아서', short: '더 좋아 보이는 회사를 찾아서' },
  { code: 'sell_fear_drop', label: '더 떨어질까 봐', short: '더 떨어질까 봐' },
  { code: 'sell_anxiety', label: '그냥 불안해서', short: '그냥 불안해서' },
  { code: 'sell_liquidity', label: '다른 데 쓸 돈이 필요해서', short: '다른 데 쓸 돈이 필요해서' }
];

/** 계획과 다르게 팔았을 때 고르는 변경 이유 5개. `short` 가 없다 — 문장에 `label` 을 그대로 쓴다. */
export const CHANGES = [
  { code: 'change_new_info', label: '새로운 소식을 알게 됐어' },
  { code: 'change_view_shift', label: '회사에 대한 생각이 바뀌었어' },
  { code: 'change_price_emotion', label: '가격이 움직여서 불안해졌어' },
  { code: 'change_alternative', label: '다른 회사가 더 좋아 보였어' },
  { code: 'change_plan_revision', label: '처음 계획이 나와 맞지 않았어' }
];

/** 코드로 문구를 찾는다. 모르는 코드는 `null` — 카드가 기본 문구로 떨어진다. */
export function choiceOf(list, code) {
  if (!code) return null;
  return list.filter((item) => item.code === code)[0] || null;
}
