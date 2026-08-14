  buildArchive(){
    const s = this.state, u = this.uni();
    const up = '#E8322E', down = '#1668DC', accent = '#D70082';
    const A = 'assets/archive/';
    const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
    const pctTxt = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%';
    const price = code => { const x = u.stocks.filter(v => v.code === code)[0]; return x ? x.price : 0; };
    const nameOf = code => { const x = u.stocks.filter(v => v.code === code)[0]; return x ? x.name : code; };
    const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };

    // 가족 구성원 ↔ 앱 계정. dad 는 아직 계정이 없어 값이 비어 있다.
    const MEMBERS = [
      { key:'dad', name:'찬영 아빠', short:'아빠', acc:null,     face:A + 'face-dad.jpg', user:'parent_dad',  col:'#FFD84D', fill:'rgba(255,197,61,0.24)', pose:A + 'pose-yw-cheer.png' },
      { key:'mom', name:'찬영 엄마', short:'엄마', acc:'parent', face:A + 'face-mom.jpg', user:'parent_mom',  col:'#FF8AD0', fill:'rgba(245,50,127,0.26)', pose:A + 'pose-yw-magnify.png' },
      { key:'me',  name:'찬영',      short:'나',   acc:'child',  face:A + 'face-me.jpg',  user:'child_minji', col:'#7FD2FF', fill:'rgba(96,190,255,0.3)',  pose:A + 'pose-ki-calm.png' }
    ];
    const byKey = {}, byUser = {};
    MEMBERS.forEach(x => { byKey[x.key] = x; byUser[x.user] = x; });
    const who = s.retWho || 'all';
    const shown = MEMBERS.filter(x => who === 'all' || x.key === who);

    // ── 성향 다섯 축 ──────────────────────────────────────────────
    // 산출식은 shared/engine/archive-profile.js 가 갖고 있다. 여기서는 부르기만 한다.
    const sectorOfCode = code => { const st = u.stocks.filter(v => v.code === code)[0]; return st ? st.sector : null; };
    const scoresOf = userId => {
      const recs = (s.records || []).filter(r => r.user_id === userId);
      const out = computeAbilityScores(recs, sectorOfCode);
      return { n: out.count, gr: out.evidencePct, list: out.scores };
    };

    // ── 투자 유형 네 가지 ─────────────────────────────────────────
    // 어느 유형인지와 레벨은 엔진이 정한다. 여기 있는 건 이름·색·설명뿐이다.
    const TYPES = {
      sniper:     { name:'저격수', img:'sniper',     pal:['#FCE3B4','#F7D08A','#E3AF57','#63430A'],
        desc:'찾아볼 건 다 찾아보고, 확신이 선 소수 섹터에 몰아 담았어요.\n근거는 촘촘하지만 한쪽으로 쏠려 있어요.' },
      strategist: { name:'전략가', img:'strategist', pal:['#F0F8CC','#E3F09B','#C6DA66','#404F16'],
        desc:'알아본 뒤 여러 섹터에 나눠 담았어요.\n근거와 분산을 모두 챙긴 한 주였어요.' },
      fighter:    { name:'승부사', img:'fighter',    pal:['#FCC7AB','#F79F79','#DE7B50','#5E2410'],
        desc:'마음에 들면 바로 한 곳에 걸었어요.\n결정은 빠르지만 남긴 기록은 얇아요.' },
      explorer:   { name:'탐험가', img:'explorer',   pal:['#B2D2C7','#87B6A7','#619484','#1B3F35'],
        desc:'여기저기 가볍게 조금씩 담거나 현금을 남겨뒀어요.\n부담은 적지만 확신은 아직 얕아요.' }
    };
    const typeOf = sc => {
      const decided = resolveCharacter(sc);
      const t = TYPES[decided.key], lv = decided.level;
      return { key:decided.key, name:t.name, desc:t.desc, img:t.img, pal:t.pal, lv:lv, title:t.name + ' LV' + lv };
    };
    const typeImg = k => A + 'type-' + k + '.png';

    const TLBL = ['집중', '분산', '정확', '직관', '근거'];
    const TMETA = [
      { c:'#FFC53D', desc:'확신한 곳에 몰아 담은 정도예요. 담은 섹터가 적고 현금이 적을수록 높아요.' },
      { c:'#4FC3F7', desc:'여러 곳에 나눠 담은 정도예요. 집중의 반대쪽 축이에요.' },
      { c:'#7BE3A0', desc:'사고판 시점이 맞았는지예요. 산 뒤 오르거나 판 뒤 내리면 올라가요.' },
      { c:'#FF8AD0', desc:'느낌으로 빠르게 결정한 비율이에요. 근거의 반대쪽 축이에요.' },
      { c:'#9B8CFF', desc:'사기 전에 뉴스·기업정보·차트를 확인하고 결정한 비율이에요.' }
    ];

    const mine = scoresOf('child_minji');
    const myType = typeOf(mine.list);
    const MPL = myType.pal, mInk = MPL[3];

    const R = 48, CX = 80, CY = 80;
    const ptAt = (i, ratio, r0, cx, cy) => {
      const a = (-90 + i * 72) * Math.PI / 180, rr = r0 * Math.max(0.1, Math.min(1, ratio));
      return [(cx + rr * Math.cos(a)).toFixed(1), (cy + rr * Math.sin(a)).toFixed(1)];
    };
    const traits = mine.list.map((score, i) => {
      const m = TMETA[i], sel = s.traitPick === i;
      const outer = ptAt(i, 1, R, CX, CY), dot = ptAt(i, score / 100, R, CX, CY);
      const a = (-90 + i * 72) * Math.PI / 180;
      const lx = (CX + R * 1.32 * Math.cos(a)) / 160 * 100, ly = (CY + R * 1.32 * Math.sin(a)) / 160 * 100;
      return {
        label: TLBL[i], score: score, desc: m.desc,
        ax: outer[0], ay: outer[1], dx: dot[0], dy: dot[1],
        dotR: sel ? 4.2 : 2.6, dotFill: sel ? '#FFFFFF' : mInk,
        select: e => { if (e && e.stopPropagation) e.stopPropagation(); this.set({ traitPick: sel ? null : i }); },
        labelNumStyle: 'font-weight:900;font-variant-numeric:tabular-nums;color:' + (sel ? '#FFFFFF' : mInk),
        labelStyle: 'position:absolute;left:' + lx.toFixed(1) + '%;top:' + ly.toFixed(1) + '%;transform:translate(-50%,-50%);white-space:nowrap;cursor:pointer;font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;' + (sel
          ? 'color:#fff;background:' + mInk + ';box-shadow:0 3px 8px ' + rgba(mInk, 0.35)
          : 'color:' + mInk + ';background:rgba(255,255,255,0.85);box-shadow:0 1px 3px ' + rgba(mInk, 0.18)),
        barStyle: 'width:' + score + '%;height:100%;border-radius:999px;background:' + m.c + ''
      };
    });
    const radarGrid = [0.25, 0.5, 0.75, 1].map(k => ({
      pts: TLBL.map((_, i) => ptAt(i, k, R, CX, CY).join(',')).join(' ')
    }));

    // ── 카드 모아보기 — 한 주에 한 장. 기록이 있는 주 + 이번 주 ────
    const monday = ts => {
      const d = new Date(ts); d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return d;
    };
    const md = d => (d.getMonth() + 1) + '/' + d.getDate();
    const myRecs = (s.records || []).filter(r => r.user_id === 'child_minji');
    const weeks = {};
    myRecs.forEach(r => { const k = monday(r.ts).getTime(); (weeks[k] || (weeks[k] = [])).push(r); });
    const thisMon = monday(Date.now()).getTime();
    if (!weeks[thisMon]) weeks[thisMon] = [];
    const weekKeys = Object.keys(weeks).map(Number).sort((a, b) => a - b);
    const WEEKS = weekKeys.map(k => {
      const recs = weeks[k], isNow = k === thisMon;
      let list;
      if (isNow) list = mine.list;
      else {
        const nSec = {};
        recs.forEach(r => { const st = u.stocks.filter(v => v.code === r.symbol)[0]; if (st) nSec[st.sector] = 1; });
        const g = recs.length ? Math.round(recs.filter(r => ['buy_news','buy_chart','buy_familiar'].indexOf(r.reason_code) >= 0).length / recs.length * 100) : 0;
        const f = Math.max(0, Math.min(100, 100 - (Math.max(1, Object.keys(nSec).length) - 1) * 22));
        list = [f, 100 - f, 50, 100 - g, g];
      }
      const t = typeOf(list);
      const mon = new Date(k), sun = new Date(k + 6 * 86400000);
      return {
        week: isNow ? '이번 주' : (mon.getMonth() + 1) + '월 ' + Math.ceil((mon.getDate() + 6) / 7) + '주차',
        date: md(mon) + ' – ' + md(sun),
        title: t.title, img: t.img, desc: recs.length === 0 ? '이번 주는 아직 산 게 없어요.\n한 번 사고 나면 여기에 채워질 거예요.' : t.desc,
        scores: list
      };
    });
    const cardActive = Math.max(0, Math.min(
      (s.cardActive === undefined || s.cardActive === null) ? WEEKS.length - 1 : s.cardActive, WEEKS.length - 1));
    const weekCards = WEEKS.map((c, ci) => {
      const on = ci === cardActive;
      const PL = (TYPES[c.img] && TYPES[c.img].pal) || TYPES.sniper.pal;
      const ink = PL[3];
      const axes = c.scores.map((sc, i) => {
        const a = (-90 + i * 72) * Math.PI / 180;
        const outer = ptAt(i, 1, R, CX, CY), dot = ptAt(i, sc / 100, R, CX, CY);
        const lx = (CX + R * 1.32 * Math.cos(a)) / 160 * 100, ly = (CY + R * 1.32 * Math.sin(a)) / 160 * 100;
        return {
          label: TLBL[i], score: sc, ax: outer[0], ay: outer[1], dx: dot[0], dy: dot[1],
          labelStyle: 'position:absolute;left:' + lx.toFixed(1) + '%;top:' + ly.toFixed(1) + '%;transform:translate(-50%,-50%);white-space:nowrap;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:999px;color:' + ink + ';background:rgba(255,255,255,0.8);box-shadow:0 1px 2px ' + rgba(ink, 0.14)
        };
      });
      return {
        week: c.week, date: c.date, title: c.title, desc: c.desc, axes: axes,
        open: () => { if (ci !== cardActive) { this.snapCard(ci); this.set({ cardActive: ci }); } else this.set({ cardSheet: ci }); },
        poly: axes.map(a => a.dx + ',' + a.dy).join(' '),
        grid: [0.25, 0.5, 0.75, 1].map(k => ({ pts: TLBL.map((_, i) => ptAt(i, k, R, CX, CY).join(',')).join(' ') })),
        imgStyle: 'width:158px;height:196px;margin:0 -16px -4px -14px;background:url(' + typeImg(c.img) + ') center bottom/contain no-repeat;filter:drop-shadow(0 12px 14px ' + rgba(ink, 0.38) + ')',
        cardStyle: 'flex:none;scroll-snap-align:center;width:296px;margin:0 9px;border-radius:28px;padding:8px;cursor:pointer;transition:transform 0.28s ease;transform-origin:center;background:linear-gradient(160deg,' + PL[0] + ' 0%,' + PL[1] + ' 46%,' + PL[2] + ' 100%);' + (on
          ? 'transform:scale(1.05);box-shadow:inset 0 1px 0 rgba(255,255,255,0.7),0 0 0 1.5px ' + rgba(ink, 0.3) + ',0 2px 3px ' + rgba(ink, 0.2) + ',0 14px 18px -8px ' + rgba(ink, 0.35)
          : 'transform:scale(0.9);box-shadow:inset 0 1px 0 rgba(255,255,255,0.5),0 1px 2px ' + rgba(ink, 0.14) + ',0 7px 10px -7px ' + rgba(ink, 0.22)),
        innerStyle: 'position:relative;border-radius:21px;padding:15px 14px 13px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.6),inset 0 0 0 1px rgba(255,255,255,0.36),inset 0 -20px 40px ' + rgba(ink, 0.1) + ';background:linear-gradient(158deg,rgba(255,255,255,0.42) 0%,rgba(255,255,255,0.14) 34%,rgba(255,255,255,0.06) 62%,rgba(255,255,255,0.2) 100%)',
        blob1: 'position:absolute;left:-40px;top:-30px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.6) 0%,rgba(255,255,255,0) 68%);filter:blur(18px);pointer-events:none',
        blob2: 'position:absolute;right:-50px;bottom:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,' + rgba(ink, 0.16) + ' 0%,' + rgba(ink, 0) + ' 68%);filter:blur(22px);pointer-events:none',
        weekStyle: 'font-size:10.5px;font-weight:800;color:' + rgba(ink, 0.9) + ';letter-spacing:0.12em;white-space:nowrap',
        dateStyle: 'font-size:10px;font-weight:700;color:' + rgba(ink, 0.75) + ';white-space:nowrap',
        titleStyle: 'position:relative;text-align:center;font-size:21px;font-weight:900;color:' + ink + ';margin-top:5px;letter-spacing:-0.01em;text-shadow:0 1px 0 rgba(255,255,255,0.6)',
        shadowStyle: 'width:82px;height:18px;margin-top:-8px;border-radius:50%;background:radial-gradient(ellipse at center,' + rgba(ink, 0.22) + ' 0%,' + rgba(ink, 0.06) + ' 46%,rgba(0,0,0,0) 72%)',
        gridStroke: rgba(ink, 0.18), axisStroke: rgba(ink, 0.16),
        polyFill: rgba(ink, 0.24), polyStroke: ink, dotFill: ink, dotStroke: '#FFFFFF',
        descBoxStyle: 'position:relative;display:flex;align-items:flex-start;gap:9px;margin-top:8px;border-radius:14px;padding:10px 11px;background:rgba(255,255,255,0.5);box-shadow:inset 0 1px 0 rgba(255,255,255,0.75),inset 0 0 0 1px rgba(255,255,255,0.45)',
        descIconStyle: 'width:26px;height:26px;flex:none;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:13px;background:rgba(255,255,255,0.8);box-shadow:0 1px 3px ' + rgba(ink, 0.2),
        descTextStyle: 'flex:1;min-width:0;font-size:11.5px;font-weight:600;color:' + rgba(ink, 0.9) + ';line-height:1.6;text-wrap:pretty'
      };
    });
    const cardDots = WEEKS.map((w, i) => ({
      style: 'width:' + (i === cardActive ? 20 : 7) + 'px;height:7px;border-radius:999px;transition:width 0.25s ease,background 0.25s ease;background:' + (i === cardActive ? accent : '#D5D8E6')
    }));

    // 카드 한 장을 눌렀을 때 올라오는 상세 시트
    const sheetIdx = (s.cardSheet === null || s.cardSheet === undefined) ? cardActive : s.cardSheet;
    const sw = WEEKS[sheetIdx] || WEEKS[WEEKS.length - 1] || { week:'', date:'', title:'', desc:'', img:'sniper', scores:[0,0,0,0,0] };
    const SPL = (TYPES[sw.img] && TYPES[sw.img].pal) || TYPES.sniper.pal, sInk = SPL[3];
    const cardSheet = {
      week: sw.week, date: sw.date, title: sw.title, desc: sw.desc,
      sheetStyle: 'position:absolute;left:0;right:0;bottom:0;z-index:7;max-height:82%;overflow-y:auto;border-radius:30px 30px 0 0;padding:14px 20px 26px;background:linear-gradient(168deg,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0.74) 100%),linear-gradient(168deg,' + SPL[0] + ' 0%,' + SPL[1] + ' 52%,' + SPL[2] + ' 100%);box-shadow:0 -18px 40px ' + rgba(sInk, 0.3),
      grabStyle: 'width:44px;height:5px;border-radius:999px;background:' + rgba(sInk, 0.25) + ';margin:0 auto 14px',
      titleStyle: 'font-size:24px;font-weight:900;color:' + sInk + ';letter-spacing:-0.01em;line-height:1.1;text-shadow:0 1px 0 rgba(255,255,255,0.5)',
      closeStyle: 'flex:none;white-space:nowrap;font-size:14px;font-weight:700;color:' + rgba(sInk, 0.6) + ';cursor:pointer;padding:6px 4px',
      rows: sw.scores.map((sc, k) => ({
        label: TLBL[k], score: sc, note: TMETA[k].desc,
        labelStyle: 'flex:1;min-width:0;font-size:16px;font-weight:800;color:' + sInk,
        scoreStyle: 'font-size:18px;font-weight:900;color:' + sInk + ';font-variant-numeric:tabular-nums',
        trackStyle: 'height:9px;border-radius:999px;background:' + rgba(sInk, 0.1) + ';box-shadow:inset 0 1px 2px ' + rgba(sInk, 0.2) + ';overflow:hidden;margin-top:8px',
        noteStyle: 'font-size:13px;font-weight:500;color:' + rgba(sInk, 0.82) + ';line-height:1.6;margin-top:7px;text-wrap:pretty;white-space:pre-line',
        barStyle: 'width:' + sc + '%;height:100%;border-radius:999px;background:' + TMETA[k].c + ''
      }))
    };

    // ── 가족 투자 성향 비교 ───────────────────────────────────────
    // 아빠는 아직 앱 계정이 없어 점수가 비어 있다.
    const FAM = MEMBERS.map(f => {
      const sc = f.acc ? scoresOf(f.user) : null;
      const t = sc && sc.n ? typeOf(sc.list) : null;
      return {
        key: f.key, name: f.name, face: f.face, col: f.col, fill: f.fill,
        has: !!(sc && sc.n), scores: sc ? sc.list : [0, 0, 0, 0, 0],
        title: t ? t.title : '',
        desc: !f.acc ? '아직 앱 계정이 없어요.\n계정이 생기면 여기에 성향이 쌓여요.'
          : (sc && sc.n) ? t.desc : '아직 산 게 없어요.\n한 번 사고 나면 성향이 만들어져요.'
      };
    });
    const famPick = s.famPick || 'all';
    const famShown = FAM.filter(f => f.has && (famPick === 'all' || f.key === famPick));
    const RR = 92, RCX = 118, RCY = 118;
    const famPolys = famShown.map(f => ({
      poly: f.scores.map((sc, i) => ptAt(i, sc / 100, RR, RCX, RCY).join(',')).join(' '),
      stroke: f.col, fill: f.fill,
      dots: f.scores.map((sc, i) => {
        const d = ptAt(i, sc / 100, RR, RCX, RCY);
        return { dx: d[0], dy: d[1], col: f.col };
      })
    }));
    const famGrid = [0.25, 0.5, 0.75, 1].map(k => ({
      pts: TLBL.map((_, i) => ptAt(i, k, RR, RCX, RCY).join(',')).join(' ')
    }));
    const famAxes = TLBL.map((lb, i) => {
      const a = (-90 + i * 72) * Math.PI / 180;
      const outer = ptAt(i, 1, RR, RCX, RCY);
      const lx = (RCX + RR * 1.24 * Math.cos(a)) / 236 * 100, ly = (RCY + RR * 1.24 * Math.sin(a)) / 236 * 100;
      return {
        label: lb, ax: outer[0], ay: outer[1],
        labelStyle: 'position:absolute;left:' + lx.toFixed(1) + '%;top:' + ly.toFixed(1) + '%;transform:translate(-50%,-50%);white-space:nowrap;font-size:11.5px;font-weight:800;color:#5C6280'
      };
    });
    const famChips = [{ key:'all', name:'전체' }].concat(FAM).map(f => ({
      name: f.name,
      pick: () => this.set({ famPick: f.key }),
      style: 'display:flex;align-items:center;gap:5px;padding:9px 16px;border-radius:999px;cursor:pointer;font-size:13px;font-weight:700;white-space:nowrap;transition:all 0.18s;' + (famPick === f.key
        ? 'color:#fff;background:' + accent
        : 'color:#6B6F85;background:#fff;box-shadow:0 1px 5px rgba(30,25,60,0.05)')
    }));
    const famCards = FAM.map(f => ({
      name: f.name, title: f.title, desc: f.desc,
      pick: () => this.set({ famPick: famPick === f.key ? 'all' : f.key }),
      iconStyle: 'width:42px;height:42px;flex:none;border-radius:999px;background:url(' + f.face + ') center/cover no-repeat,' + f.col + '2E;box-shadow:inset 0 0 0 2px ' + f.col + '99',
      dotStyle: 'width:9px;height:9px;border-radius:999px;flex:none;background:' + f.col,
      rowStyle: 'display:flex;align-items:flex-start;gap:12px;padding:13px 15px;border-radius:22px;cursor:pointer;transition:box-shadow 0.18s ease;background:#FFFFFF;' + (famPick === f.key
        ? 'box-shadow:inset 0 0 0 2px ' + f.col + ',0 2px 10px rgba(30,25,60,0.05)'
        : 'box-shadow:0 2px 10px rgba(30,25,60,0.05)')
    }));

    // ── 수익률 탭 ────────────────────────────────────────────────
    let cash = 0, stockValue = 0, cost = 0;
    shown.forEach(x => {
      if (!x.acc) return;
      const a = s.acc[x.acc];
      cash += a.cash;
      a.holdings.forEach(h => { stockValue += h.qty * price(h.code); cost += h.qty * h.avg; });
    });
    const pnl = stockValue - cost;
    const pnlPct = cost > 0 ? pnl / cost * 100 : 0, heroPos = pnl >= 0;

    const avat = (m, size) => 'width:' + size + 'px;height:' + size + 'px;flex:none;border-radius:999px;background:url(' + m.face + ') center/cover no-repeat,#FFFFFF;box-shadow:0 4px 9px -3px rgba(35,25,80,0.22),0 0 0 2px ' + m.col + '66';
    const pctPill = v => 'flex:none;font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;padding:4px 9px;border-radius:999px;color:' + (v >= 0 ? up : down) + ';background:' + (v >= 0 ? 'rgba(232,50,46,0.09)' : 'rgba(22,104,220,0.09)');

    const SECIMG = { auto:'auto', semi:'semi', food:'food', game:'game', enter:'enter', energy:'energy' };
    const secImg = id => SECIMG[id] ? A + 'sector-' + SECIMG[id] + '.png' : null;
    const secGroups = [];
    shown.forEach(x => {
      if (!x.acc) return;
      s.acc[x.acc].holdings.forEach(h => {
        const st = u.stocks.filter(v => v.code === h.code)[0];
        if (!st) return;
        const sec = this.sectorOf(st.sector);
        let g = secGroups.filter(y => y.id === st.sector)[0];
        if (!g) { g = { id:st.sector, key:sec.name || '기타', emoji:sec.emoji, rows:[], value:0, cost:0 }; secGroups.push(g); }
        const val = h.qty * st.price;
        const pc = h.avg > 0 ? (st.price - h.avg) / h.avg * 100 : 0;
        g.rows.push({
          stockName: st.name, avatarStyle: avat(x, 38),
          qtyText: (h.qty >= 1 ? (Math.round(h.qty * 100) / 100) : h.qty.toFixed(2)) + '주',
          valueText: won(val), pctText: pctTxt(pc), pctStyle: pctPill(pc)
        });
        g.value += val; g.cost += h.qty * h.avg;
      });
    });
    secGroups.sort((a, b) => b.value - a.value);
    const secKeys = secGroups.map(g => g.id);
    const secPick = secKeys.indexOf(s.retSecPick) >= 0 ? s.retSecPick : (secKeys[0] || null);
    const retSectors = secGroups.map(g => {
      const gp = g.cost > 0 ? (g.value - g.cost) / g.cost * 100 : 0;
      const on = g.id === secPick, img = secImg(g.id);
      return {
        name: g.key, emoji: img ? '' : g.key.charAt(0),
        countText: g.rows.length + '개 종목',
        pctText: pctTxt(gp),
        pctStyle: 'font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;margin-top:8px;color:' + (gp >= 0 ? up : down),
        cardStyle: 'flex:none;width:108px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;text-align:center;border-radius:20px;padding:16px 10px 17px;cursor:pointer;transition:box-shadow 0.18s;background:#fff;box-shadow:' + (on ? '0 0 0 2px ' + accent + ',0 4px 14px rgba(30,25,60,0.09)' : '0 2px 10px rgba(30,25,60,0.05)'),
        iconStyle: 'width:50px;height:50px;flex:none;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:25px;background:' + (img ? 'url(' + img + ') center/74% no-repeat,' : '') + '#F5F6FB',
        pick: () => this.set({ retSecPick: g.id, retSecModal: g.id })
      };
    });
    const secModal = secGroups.filter(g => g.id === s.retSecModal)[0] || null;
    const secModalPct = secModal && secModal.cost > 0 ? (secModal.value - secModal.cost) / secModal.cost * 100 : 0;
    const secModalImg = secModal ? secImg(secModal.id) : null;

    // 피드 — 매수·매도 기록을 최신순으로. 댓글은 계정 있는 사람만 남길 수 있다.
    const ago = ts => {
      const min = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
      if (min < 60) return min + '분 전';
      if (min < 1440) return Math.round(min / 60) + '시간 전';
      return Math.round(min / 1440) + '일 전';
    };
    const meMember = byUser[s.account === 'child' ? 'child_minji' : 'parent_mom'];
    const cmts = s.arcCmts || {}, cmtOpen = s.arcCmtOpen || {}, cmtD = s.arcCmtDraft || {};
    const edit = s.arcCmtEdit || null;
    const events = []
      .concat((s.records || []).map(r => ({ r: r, sell: false })))
      .concat((s.sellRecords || []).map(r => ({ r: r, sell: true })))
      .filter(e => { const m = byUser[e.r.user_id]; return m && (who === 'all' || m.key === who); })
      .sort((a, b) => String(b.r.ts).localeCompare(String(a.r.ts)))
      .slice(0, 12);
    const retFeed = events.map(e => {
      const r = e.r, m = byUser[r.user_id], id = r.order_id;
      const now = price(r.symbol), avg = e.sell ? (r.avg || now) : (r.amount_krw / (r.qty || 1));
      const pc = avg ? (now - avg) / avg * 100 : 0, pos = pc >= 0;
      const liked = (s.arcLikes || {})[id];
      const d = new Date(r.ts);
      const reason = (e.sell ? SELL_REASONS : REASONS).filter(x => x.code === (r.sell_reason_code || r.reason_code))[0];
      const list = cmts[id] || [];
      return {
        name: m.name, time: ago(r.ts), avatarStyle: avat(m, 44),
        dateLabel: (d.getMonth() + 1) + '월 ' + d.getDate() + '일 수익률',
        stockName: nameOf(r.symbol),
        bigPctText: (pos ? '+' : '−') + Math.abs(pc).toFixed(2) + '%',
        blockStyle: 'flex:none;width:39%;position:relative;overflow:hidden;padding:13px 14px 14px;display:flex;flex-direction:column;justify-content:space-between;background:' + (pos ? accent : '#001E5A'),
        blockEmojiStyle: 'position:absolute;right:-2px;bottom:-2px;width:56px;height:60px;background:url(' + m.pose + ') right bottom/contain no-repeat;filter:drop-shadow(0 4px 7px rgba(0,0,0,0.3))',
        avgPctText: won(avg),
        avgPctStyle: 'font-size:25px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-0.01em;margin-top:4px;white-space:nowrap;color:' + (pos ? up : down),
        oneLiner: reason ? reason.short : (e.sell ? '팔았어' : '담았어'),
        text: (e.sell ? '팔았어. ' : '담았어. ') + (r.memo || (reason ? reason.short + ' 결정했어.' : '')),
        cmtCount: list.length,
        cmtOpen: !!cmtOpen[id],
        toggleCmt: () => this.set({ arcCmtOpen: Object.assign({}, cmtOpen, { [id]: !cmtOpen[id] }) }),
        cmtBtnStyle: 'display:flex;align-items:center;gap:6px;font-size:14px;font-weight:700;cursor:pointer;font-variant-numeric:tabular-nums;color:' + (cmtOpen[id] ? '#0A3272' : '#A9AEC4'),
        likeCount: liked ? 1 : 0,
        likeIcon: '좋아요',
        likeStyle: 'display:flex;align-items:center;gap:6px;font-size:14px;font-weight:700;cursor:pointer;font-variant-numeric:tabular-nums;color:' + (liked ? accent : '#A9AEC4'),
        like: () => this.set({ arcLikes: Object.assign({}, s.arcLikes || {}, { [id]: !liked }) }),
        comments: list.map((c, i) => {
          const q = byKey[c.who] || meMember;
          const isEd = !!(edit && edit.id === id && edit.i === i);
          return {
            name: q.name, text: c.text, avatarStyle: avat(q, 26),
            canEdit: c.who === meMember.key && !isEd, editing: isEd, notEditing: !isEd,
            editDraft: isEd ? (s.arcCmtEditDraft || '') : '',
            actStyle: 'font-size:11.5px;font-weight:700;color:#A9AEC4;padding:4px 8px;border-radius:999px;background:#F2F3FA;cursor:pointer;white-space:nowrap',
            onEditDraft: ev => this.setState({ arcCmtEditDraft: ev.target.value }),
            startEdit: () => this.setState({ arcCmtEdit: { id: id, i: i }, arcCmtEditDraft: c.text }),
            saveEdit: () => {
              const v = (this.state.arcCmtEditDraft || '').trim(); if (!v) return;
              const arr = (cmts[id] || []).slice(); arr[i] = { who: c.who, text: v };
              this.set({ arcCmts: Object.assign({}, cmts, { [id]: arr }), arcCmtEdit: null, arcCmtEditDraft: '' });
            },
            cancelEdit: () => this.setState({ arcCmtEdit: null, arcCmtEditDraft: '' }),
            del: () => {
              const arr = (cmts[id] || []).slice(); arr.splice(i, 1);
              this.set({ arcCmts: Object.assign({}, cmts, { [id]: arr }), arcCmtEdit: null, arcCmtEditDraft: '' });
            }
          };
        }),
        meAvatarStyle: avat(meMember, 30),
        draft: cmtD[id] || '',
        onDraft: ev => { const v = ev.target.value; this.setState(st => ({ arcCmtDraft: Object.assign({}, st.arcCmtDraft || {}, { [id]: v }) })); },
        sendStyle: 'flex:none;font-size:12.5px;font-weight:800;padding:8px 12px;border-radius:999px;cursor:pointer;white-space:nowrap;' + ((cmtD[id] || '').trim()
          ? 'color:#fff;background:#001E5A'
          : 'color:#B8BDD0;background:#F0F1F7'),
        send: () => {
          const v = (cmtD[id] || '').trim(); if (!v) return;
          this.set({
            arcCmts: Object.assign({}, cmts, { [id]: (cmts[id] || []).concat([{ who: meMember.key, text: v }]) }),
            arcCmtDraft: Object.assign({}, cmtD, { [id]: '' })
          });
        }
      };
    });

    // ── 가족 수익률 달리기 ──────────────────────────────────────────
    // 트랙 왼쪽 2/5 지점이 START. 플러스면 오른쪽으로 웃으며 달리고,
    // 마이너스면 START 왼쪽에서 왼쪽을 보고 땀을 흘린다.
    const RUN_START = 40;
    const LANE_H = 74;
    const runRaw = ['me', 'mom', 'dad'].map(k => {
      const x = byKey[k];
      if (!x.acc) return { m:x, has:false, pct:0 };
      const a = s.acc[x.acc];
      let val = 0, cst = 0;
      a.holdings.forEach(h => { val += h.qty * price(h.code); cst += h.qty * h.avg; });
      return { m:x, has: cst > 0, pct: cst > 0 ? (val - cst) / cst * 100 : 0 };
    });
    // 가장 많이 간 사람이 트랙 끝에 닿도록 잡되, 다들 0 에 가까우면 5% 를 기준으로 둔다
    const runMax = Math.max(5, ...runRaw.map(r => Math.abs(r.pct)));
    const runners = runRaw.map(r => {
      const minus = r.has && r.pct < 0;
      const raw = r.pct >= 0
        ? RUN_START + (r.pct / runMax) * 55
        : RUN_START + (r.pct / runMax) * 35;
      const at = r.has ? Math.max(13, Math.min(87, raw)) : RUN_START;
      const ring = r.m.col;
      return {
        name: r.m.name,
        // 방향은 얼굴 반전과 뒤로 흐르는 모션선으로만 알린다
        pctText: r.has ? ((r.pct >= 0 ? '+' : '−') + Math.abs(r.pct).toFixed(1) + '%') : '아직',
        laneStyle: 'position:relative;height:' + LANE_H + 'px;box-shadow:inset 0 -1px 0 #E4E6F1',
        nameStyle: 'position:absolute;left:8px;top:6px;z-index:3;font-size:11px;font-weight:700;color:#8E93A8;white-space:nowrap;'
          + 'background:rgba(244,245,251,0.9);border-radius:999px;padding:1px 6px',
        // 주자 묶음 — 마이너스면 통째로 좌우 반전해 왼쪽을 보게 한다
        runnerStyle: 'position:absolute;left:' + at.toFixed(1) + '%;top:50%;transform:translate(-50%,-50%)'
          + (minus ? ' scaleX(-1)' : '') + ';display:flex;align-items:center;gap:4px;transition:left 0.4s ease',
        dashStyle: (r.has && Math.abs(r.pct) > 0.05)
          ? 'width:14px;height:12px;flex:none;border-radius:2px;opacity:0.45;background:repeating-linear-gradient(to bottom,' + ring + ' 0 2px,transparent 2px 5px)'
          : 'display:none',
        faceStyle: 'width:34px;height:34px;flex:none;border-radius:999px;background:url(' + r.m.face + ') center/cover no-repeat,#EDEFF6;'
          + 'box-shadow:0 0 0 2.5px ' + ring + (r.has ? '' : '55') + ',0 2px 6px rgba(30,25,60,0.18)'
          + (r.has ? '' : ';filter:grayscale(0.6);opacity:0.6'),
        pctStyle: 'position:absolute;left:50%;top:34px;transform:translateX(-50%)' + (minus ? ' scaleX(-1)' : '')
          + ';font-size:11px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:'
          + (!r.has ? '#B8BDD0' : (r.pct >= 0 ? up : down))
      };
    });
    const runStartLabelStyle = 'position:absolute;left:' + RUN_START + '%;top:4px;transform:translateX(-50%);z-index:3;'
      + 'font-size:9.5px;font-weight:800;letter-spacing:0.1em;color:#8E93A8;background:#F4F5FB;padding:0 5px;white-space:nowrap';
    const runStartLineStyle = 'position:absolute;left:' + RUN_START + '%;top:0;bottom:0;width:0;'
      + 'border-left:2px dashed #C6CBDD;transform:translateX(-1px);pointer-events:none';

    const d0 = new Date();
    return {
      weekLabel: (d0.getMonth() + 1) + '월 ' + Math.ceil(d0.getDate() / 7) + '주차',

      // 성향
      traits: traits, radarGrid: radarGrid,
      radarPoly: traits.map(t => t.dx + ',' + t.dy).join(' '),
      type: myType, pal: MPL, ink: mInk, typeImgUrl: typeImg(myType.img),

      // 카드 모아보기
      weekCards: weekCards, cardDots: cardDots, cardSheet: cardSheet, cardCount: WEEKS.length,

      // 가족 비교
      famPolys: famPolys, famGrid: famGrid, famAxes: famAxes, famChips: famChips, famCards: famCards,

      // 수익률
      runners: runners, runStartLabelStyle: runStartLabelStyle, runStartLineStyle: runStartLineStyle,
      retHeroLabel: who === 'all' ? '우리 가족 수익률' : byKey[who].short + ' 수익률',
      retHeroPctText: (heroPos ? '+' : '−') + Math.abs(pnlPct).toFixed(2) + '%',
      retHeroPctStyle: 'font-size:40px;font-weight:800;line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (heroPos ? '#FF8574' : '#8AB6FF'),
      retHeroTotalText: won(cash + stockValue),
      retCashText: won(cash),
      retSectors: retSectors, retNoHoldings: secGroups.length === 0,
      retFeed: retFeed,
      retFeedLabel: who === 'all' ? '가족 피드' : byKey[who].name + '의 피드',
      secModal: secModal,
      secModalEmoji: secModal ? (secModalImg ? '' : secModal.key.charAt(0)) : '',
      secModalIconStyle: 'width:56px;height:56px;flex:none;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:28px;background:' + (secModalImg ? 'url(' + secModalImg + ') center/74% no-repeat,' : '') + '#F5F6FB',
      secModalName: secModal ? secModal.key : '',
      secModalCount: secModal ? secModal.rows.length + '개 종목' : '',
      secModalValue: secModal ? won(secModal.value) : '',
      secModalPctText: pctTxt(secModalPct),
      secModalPctStyle: 'font-size:18px;font-weight:800;line-height:1;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;margin-top:5px;white-space:nowrap;color:' + (secModalPct >= 0 ? up : down),
      secModalRows: secModal ? secModal.rows : []
    };
  }
