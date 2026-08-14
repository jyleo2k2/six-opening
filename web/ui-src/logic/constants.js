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

// ── 랭킹 화면 ────────────────────────────────────────────────────────────────
// 가족마다 프로필과 색을 하나씩 갖는다. 시상대에 서든 목록에 있든 같은 것을 쓴다.
// img 가 있으면 실제 가족사진, 없으면 마스코트 이모지 + 색으로 대신한다.
// 사진 가족과 이모지 가족은 순위와 상관없이 섞어 둔다. '우리 가족'만 family1로 고정.
const RK_FAMS = {
  '우리 가족':   { img:'assets/profiles/family1.jpg',  a:'#FFFFFF', b:'#FFE6F1' },
  '별빛 가족':   {                                     a:'#FFE6D6', b:'#F8C9A6' },
  '초록곰 가족': { img:'assets/profiles/family2.jpg',  a:'#DFF6E4', b:'#B6E7C2' },
  '바다별 가족': {                                     a:'#DCEBFF', b:'#B6D6FA' },
  '달토끼 가족': { img:'assets/profiles/family3.jpg',  a:'#F5EEFF', b:'#DED0F7' },
  '해바라기 가족': {                                   a:'#FFF4D6', b:'#FBE1A2' },
  '구름섬 가족': { img:'assets/profiles/family4.jpg',  a:'#EDF1F7', b:'#D2DCE8' },
  '무지개 가족': { img:'assets/profiles/family5.jpg',  a:'#F7ECFF', b:'#E2CBF7' },
  '밤톨 가족':   {                                     a:'#FFE9DA', b:'#F9CBA6' },
  '민들레 가족': { img:'assets/profiles/family6.jpg',  a:'#FFF7DA', b:'#FAE7A4' },
  '도토리 가족': { img:'assets/profiles/family7.jpg',  a:'#F6EEE4', b:'#E4CFB6' },
  '눈송이 가족': {                                     a:'#EFF6FF', b:'#D3E6F7' },
  '파랑새 가족': { img:'assets/profiles/family8.jpg',  a:'#E7F4FF', b:'#C4E1F7' },
  '산들바람 가족': {                                   a:'#F2F0E6', b:'#DCD7C2' },
  '반짝별 가족': { img:'assets/profiles/family9.jpg',  a:'#FFF6E0', b:'#F8E0A8' },
  '씨앗 가족':   { img:'assets/profiles/family10.jpg', a:'#EDF7EC', b:'#CBE6C6' }
};
const RK_LEAGUES = {
  week: [
    { name:'별빛 가족',   pct:'+6.8%' },
    { name:'초록곰 가족', pct:'+5.1%' },
    { name:'바다별 가족', pct:'+3.4%' },
    { name:'우리 가족',   pct:'+2.5%', me:true, step:'▲ 2계단' },
    { name:'달토끼 가족', pct:'+1.2%' },
    { name:'해바라기 가족', pct:'-0.4%' },
    { name:'구름섬 가족', pct:'-1.6%' },
    { name:'무지개 가족', pct:'-2.3%' },
    { name:'밤톨 가족',   pct:'-2.8%' },
    { name:'민들레 가족', pct:'-3.1%' },
    { name:'도토리 가족', pct:'-3.5%' },
    { name:'눈송이 가족', pct:'-3.9%' },
    { name:'파랑새 가족', pct:'-4.2%' },
    { name:'산들바람 가족', pct:'-4.6%' },
    { name:'반짝별 가족', pct:'-5.0%' },
    { name:'씨앗 가족',   pct:'-5.5%' }
  ],
  season: [
    { name:'바다별 가족', pct:'+18.4%' },
    { name:'별빛 가족',   pct:'+12.9%' },
    { name:'무지개 가족', pct:'+9.6%' },
    { name:'초록곰 가족', pct:'+7.7%' },
    { name:'밤톨 가족',   pct:'+5.1%' },
    { name:'달토끼 가족', pct:'+2.8%' },
    { name:'우리 가족',   pct:'+1.9%', me:true, step:'▲ 3계단' },
    { name:'구름섬 가족', pct:'+1.3%' },
    { name:'민들레 가족', pct:'+0.6%' },
    { name:'도토리 가족', pct:'-0.9%' },
    { name:'해바라기 가족', pct:'-1.7%' },
    { name:'눈송이 가족', pct:'-2.6%' },
    { name:'파랑새 가족', pct:'-3.4%' },
    { name:'산들바람 가족', pct:'-4.5%' },
    { name:'반짝별 가족', pct:'-5.8%' },
    { name:'씨앗 가족',   pct:'-7.2%' }
  ]
};
// 사진이면 꽉 차게 깔고, 없으면 가족색 그라데이션 위에 이모지를 얹는다.
function rkFace(f){
  return f.img
    ? 'background-color:#EDEFF6;background-image:url(' + f.img + ');background-size:cover;background-position:center'
    : 'background:linear-gradient(153deg,' + f.a + ' 0%,' + f.b + ' 100%)';
}
// 시상대 세 칸의 좌표는 시안(402×874) 기준 절대값이다.
const RK_POD = {
  1: { slot:'left:137px;bottom:96px;width:128px', av:76, avR:24, emo:44, nameFs:'14.5px', pctFs:'13px',
       pedL:136.6, pedT:328, pedW:128.8, pedH:64, medR:13.7, medT:19.3, medFs:'15px', medCol:'#7A5200',
       medBg:'radial-gradient(circle at 50% 20%,#FFF3C4 0%,#FFD44E 42%,#E39C00 100%)' },
  2: { slot:'left:14.8px;bottom:78px;width:120px', av:56, avR:18, emo:31, nameFs:'13px', pctFs:'12px',
       pedL:22, pedT:346, pedW:105.6, pedH:46, medR:10.8, medT:14.2, medFs:'13px', medCol:'#4E566B',
       medBg:'radial-gradient(circle at 50% 20%,#FBFCFF 0%,#D5DAE7 44%,#98A1B7 100%)' },
  3: { slot:'left:267.2px;bottom:64px;width:120px', av:56, avR:18, emo:31, nameFs:'13px', pctFs:'12px',
       pedL:274.4, pedT:360, pedW:105.6, pedH:32, medR:10.8, medT:12.2, medFs:'13px', medCol:'#5E3512',
       medBg:'radial-gradient(circle at 50% 20%,#F8DDBE 0%,#DFA76A 44%,#A9631F 100%)' }
};
const PED_FACE = 'linear-gradient(180deg,#FFD873 0%,#F5B333 46%,#DC8F12 100%)';

function rkPodium(tab){
  // 화면 왼쪽부터 2등 · 1등 · 3등 순으로 그린다.
  return [2, 1, 3].map(rank => {
    const row = (RK_LEAGUES[tab] || RK_LEAGUES.week)[rank - 1];
    const f = RK_FAMS[row.name] || { a:'#FFFFFF', b:'#E9E9F0' };
    const g = RK_POD[rank];
    const ring = row.me
      ? '0 0 0 3px #F5327F,0 0 18px rgba(245,50,127,0.55)'
      : (rank === 1 ? '0 0 0 3px #FFC940,0 0 20px rgba(255,201,64,0.5)' : '0 0 0 2px rgba(255,255,255,0.26)');
    const ribW = g.medR * 1.02, ribH = g.medR * 2.0, ribTop = g.medT + g.medR * 0.85;
    const rib = 'position:absolute;top:' + ribTop + 'px;left:50%;width:' + ribW + 'px;height:' + ribH
      + 'px;border-radius:2px;background:linear-gradient(180deg,#4E86DC 0%,#2A5BA8 100%);'
      + 'clip-path:polygon(0 0,100% 0,100% 100%,50% 74%,0 100%);transform-origin:50% 0;';
    return {
      rank: rank, name: row.name, pct: row.pct, emoji: f.img ? '' : row.name.charAt(0),
      crown: '',
      step: row.step || '',
      slotStyle: 'position:absolute;' + g.slot + ';display:flex;flex-direction:column;align-items:center;pointer-events:none',
      crownStyle: rank === 1
        ? 'font-size:23px;line-height:1;margin-bottom:2px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35))'
        : 'display:none',
      nameStyle: 'font-size:' + g.nameFs + ';font-weight:' + (rank === 1 ? 800 : 700) + ';color:#fff;white-space:nowrap;'
        + 'max-width:100%;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 7px rgba(0,4,25,0.45)',
      pillStyle: 'margin-top:5px;display:flex;flex-direction:column;align-items:center;padding:'
        + (row.me ? '3px 12px 5px' : '2px 10px 3px') + ';border-radius:' + (row.me ? '13px' : '999px')
        + ';background:rgba(1,14,52,0.55);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12)',
      pctStyle: 'font-size:' + g.pctFs + ';font-weight:800;color:#FFE6F4;font-variant-numeric:tabular-nums;white-space:nowrap',
      stepStyle: row.step
        ? 'margin-top:3px;display:flex;align-items:center;justify-content:center;padding:0 9px;height:16px;border-radius:999px;'
          + 'background:rgba(245,50,127,0.92);font-size:10.5px;font-weight:800;color:#fff;white-space:nowrap;'
          + 'box-shadow:0 3px 8px rgba(224,29,107,0.45)'
        : 'display:none',
      avStyle: 'margin-top:8px;width:' + g.av + 'px;height:' + g.av + 'px;border-radius:' + g.avR + 'px;display:flex;'
        + 'align-items:center;justify-content:center;font-size:' + g.emo + 'px;line-height:1;overflow:hidden;'
        + rkFace(f) + ';box-shadow:' + ring + ',0 14px 26px rgba(0,8,35,0.42)',
      pedStyle: 'position:absolute;left:' + g.pedL + 'px;top:' + g.pedT + 'px;width:' + g.pedW + 'px;height:' + g.pedH
        + 'px;border-radius:7px 7px 5px 5px;background:' + PED_FACE + ';box-shadow:inset 0 1px 0 rgba(255,255,255,0.55),'
        + 'inset 0 -11px 18px rgba(150,88,0,0.30),inset 9px 0 15px rgba(255,236,180,0.30),0 12px 22px rgba(0,6,30,0.38)',
      pedTopStyle: 'position:absolute;left:-4px;right:-4px;top:-7px;height:13px;border-radius:7px;'
        + 'background:linear-gradient(180deg,#FFEDB4 0%,#FCCB63 100%);box-shadow:0 2px 0 rgba(186,116,8,0.35)',
      ribLStyle: rib + 'margin-left:-' + (g.medR * 1.04) + 'px;transform:rotate(-16deg)',
      ribRStyle: rib + 'margin-left:' + (g.medR * 0.02) + 'px;transform:rotate(16deg)',
      medStyle: 'position:absolute;left:50%;top:' + g.medT + 'px;margin-left:-' + g.medR + 'px;width:' + (g.medR * 2)
        + 'px;height:' + (g.medR * 2) + 'px;border-radius:999px;display:flex;align-items:center;justify-content:center;'
        + 'font-size:' + g.medFs + ';font-weight:900;color:' + g.medCol + ';background:' + g.medBg
        + ';box-shadow:0 4px 8px rgba(0,6,30,0.42),inset 0 1px 0 rgba(255,255,255,0.85)'
    };
  });
}

function rkRows(tab, upC, downC){
  return (RK_LEAGUES[tab] || RK_LEAGUES.week).slice(3).map((row, i) => {
    const f = RK_FAMS[row.name] || { a:'#FFFFFF', b:'#E9E9F0' };
    const me = !!row.me, neg = row.pct.charAt(0) === '-';
    return {
      rank: i + 4, name: row.name, pct: row.pct, emoji: f.img ? '' : row.name.charAt(0), step: row.step || '',
      rowStyle: 'flex:none;height:64px;display:flex;align-items:center;padding:0 18px 0 10px;border-radius:28px;' + (me
        ? 'background:linear-gradient(180deg,#FF7FB8 0%,#F5327F 62%,#E01D6B 100%);'
          + 'box-shadow:0 14px 26px -8px rgba(224,29,107,0.42),inset 0 1px 0 rgba(255,255,255,0.35)'
        : 'background:linear-gradient(180deg,#FFFFFF 0%,#FFFFFF 55%,#F2F3FA 100%);'
          + 'box-shadow:0 2px 10px rgba(30,25,60,0.05)'),
      rankStyle: 'flex:none;width:32px;text-align:center;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;color:'
        + (me ? '#fff' : '#A9AEC4'),
      plateStyle: 'flex:none;margin-left:2px;width:44px;height:44px;border-radius:15px;display:flex;align-items:center;'
        + 'justify-content:center;font-size:23px;line-height:1;overflow:hidden;' + (f.img
          ? 'background-color:#EDEFF6;background-image:url(' + f.img + ');background-size:cover;background-position:center'
          : 'background:linear-gradient(153deg,#FFFFFF 0%,' + f.a + ' 100%)')
        + ';box-shadow:0 4px 10px rgba(35,25,80,0.13),inset 0 0 0 1px rgba(255,255,255,' + (f.img ? '0.5' : '0.8') + ')',
      nameStyle: 'flex:1;min-width:0;margin-left:15px;font-size:15.5px;font-weight:' + (me ? 800 : 600) + ';color:'
        + (me ? '#fff' : '#5C6280') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
      badgeStyle: row.step
        ? 'flex:none;margin-right:11px;display:flex;align-items:center;padding:0 10px;height:20px;border-radius:999px;'
          + 'background:#fff;font-size:11.5px;font-weight:800;color:#F5327F;white-space:nowrap;box-shadow:0 3px 8px rgba(120,10,60,0.2)'
        : 'display:none',
      pctStyle: 'flex:none;font-size:15.5px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:'
        + (me ? '#fff' : (neg ? downC : upC))
    };
  });
}

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

