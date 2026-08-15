const SEED = 10000000, FEE = 0.00015;

const REASONS = [
  { code:'buy_news',      label:'뉴스에서 봐서',            short:'뉴스를 보고' },
  { code:'buy_chart',     label:'그래프가 좋아 보여서',      short:'그래프를 보고' },
  { code:'buy_familiar',  label:'내가 아는 회사라서',        short:'내가 아는 회사라서' },
  { code:'buy_ranking',   label:'인기 순위에서 봐서',        short:'인기 순위를 보고' },
  { code:'buy_social',    label:'친구·가족이 말해줘서',      short:'친구·가족 말을 듣고' },
  { code:'buy_intuition', label:'그냥 느낌이 좋아서',        short:'느낌이 좋아서' }
];
const PLANS = [
  { code:'plan_short',  label:'이번 주만',                    short:'이번 주만' },
  { code:'plan_season', label:'시즌 끝까지',                  short:'시즌 끝까지' },
  { code:'plan_target', label:'내가 정한 목표 가격이 되면',   short:'목표 가격이 되면' },
  { code:'plan_none',   label:'아직 모르겠어',                short:'아직 모르겠지만' }
];
const SELL_REASONS = [
  { code:'sell_target_hit', label:'목표한 만큼 와서',        short:'목표한 만큼 와서' },
  { code:'sell_plan_time',  label:'정한 날짜가 돼서',        short:'정한 날짜가 돼서' },
  { code:'sell_rebalance',  label:'더 좋아 보이는 회사를 찾아서', short:'더 좋아 보이는 회사를 찾아서' },
  { code:'sell_fear_drop',  label:'더 떨어질까 봐',          short:'더 떨어질까 봐' },
  { code:'sell_anxiety',    label:'그냥 불안해서',           short:'그냥 불안해서' },
  { code:'sell_liquidity',  label:'다른 데 쓸 돈이 필요해서', short:'다른 데 쓸 돈이 필요해서' }
];
const CHANGES = [
  { code:'change_new_info',       label:'새로운 소식을 알게 됐어' },
  { code:'change_view_shift',     label:'회사에 대한 생각이 바뀌었어' },
  { code:'change_price_emotion',  label:'가격이 움직여서 불안해졌어' },
  { code:'change_alternative',    label:'다른 회사가 더 좋아 보였어' },
  { code:'change_plan_revision',  label:'처음 계획이 나와 맞지 않았어' }
];
const SHORT_TERM_DAYS = 7;

const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const glass = 'background:#FFFFFF;box-shadow:0 2px 10px rgba(30,25,60,0.05)';
const CTA_ON = "position:relative;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em;cursor:pointer;background:radial-gradient(ellipse 56% 48% at 46% -8%,rgba(255,251,248,0.94) 0%,rgba(255,238,245,0.42) 38%,rgba(255,255,255,0.06) 70%,rgba(255,255,255,0) 92%),radial-gradient(ellipse 94% 48% at 50% 120%,rgba(255,202,226,0.6) 0%,rgba(255,202,226,0) 78%),linear-gradient(180deg,#FFA0C6 0%,#FC7DAF 34%,#F663A1 66%,#EE4A8E 100%);box-shadow:5px 16px 26px -9px rgba(214,54,124,0.4),8px 34px 48px -20px rgba(214,54,124,0.24),inset 0 -24px 32px -16px rgba(255,255,255,0.42),inset 0 4px 6px rgba(255,255,255,0.5)";
const CTA_OFF = "position:relative;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#FFFFFF;letter-spacing:-0.01em;cursor:not-allowed;background:#C6C9D8";
// 주된 버튼 옆에 서는 보조 버튼 (홈으로 같은 것)
const SUB_CTA = "flex:1;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#01185A;letter-spacing:-0.01em;cursor:pointer;background:#EFEFF5";

// 시드 2주치 거래(shared/store/family-trade-seed.ts와 동일)의 결과 잔고.
// 김찬영: 매수 891,000 − 매도 회수 230,500 / 엄마: 매수 690,750 − 매도 회수 231,000.
// 보유 평균단가는 시드 체결가 기준이다. 여기 값을 바꾸면 시드 파일과 함께 바꾼다.
const seedAccounts = () => ({
  child:  { name:'김찬영', cash: SEED - 660500, holdings: [ { code:'259960', qty:2, avg:232000 }, { code:'352820', qty:1, avg:181000 } ], pending:[] },
  parent: { name:'엄마', cash: SEED - 459750, holdings: [ { code:'005930', qty:1, avg:240000 }, { code:'011200', qty:10, avg:21075 } ], pending:[] }
});

