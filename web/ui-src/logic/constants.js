// REASONS·PLANS·SELL_REASONS·CHANGES 는 `shared/data/trade-copy.js` 가 원본이고
// 조립기가 `logic/trade-copy.js` 조각으로 넣는다. 여기 다시 적지 않는다.
const SHORT_TERM_DAYS = 7;

const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const glass = 'background:#FFFFFF;box-shadow:0 2px 10px rgba(30,25,60,0.05)';
const CTA_ON = "position:relative;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em;cursor:pointer;background:radial-gradient(ellipse 56% 48% at 46% -8%,rgba(255,251,248,0.94) 0%,rgba(255,238,245,0.42) 38%,rgba(255,255,255,0.06) 70%,rgba(255,255,255,0) 92%),radial-gradient(ellipse 94% 48% at 50% 120%,rgba(255,202,226,0.6) 0%,rgba(255,202,226,0) 78%),linear-gradient(180deg,#FFA0C6 0%,#FC7DAF 34%,#F663A1 66%,#EE4A8E 100%);box-shadow:5px 16px 26px -9px rgba(214,54,124,0.4),8px 34px 48px -20px rgba(214,54,124,0.24),inset 0 -24px 32px -16px rgba(255,255,255,0.42),inset 0 4px 6px rgba(255,255,255,0.5)";
const CTA_OFF = "position:relative;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#FFFFFF;letter-spacing:-0.01em;cursor:not-allowed;background:#C6C9D8";
// 주된 버튼 옆에 서는 보조 버튼 (홈으로 같은 것)
const SUB_CTA = "flex:1;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#01185A;letter-spacing:-0.01em;cursor:pointer;background:#EFEFF5";
