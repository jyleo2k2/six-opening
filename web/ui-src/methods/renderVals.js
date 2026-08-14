  renderVals(){
    const s = this.state, m = this.me(), st = this.stock(), u = this.uni();
    const total = this.totalAsset(), pnl = total - SEED;
    const up = '#E8322E', down = '#1668DC';
    // 주문 직후 값 — 매수 3단계 축하 화면과 매도 3단계 완료 화면이 이걸로 문구를 만든다
    const od = s.orderDone || {};
    const odQty = od.qty === undefined ? '' : ((Math.round(od.qty * 100) / 100) + '주');
    const sd = s.sellDone || {};
    const sdQty = sd.qty === undefined ? '' : ((Math.round(sd.qty * 100) / 100) + '주');
    const rankTab = s.rankTab || 'week';
    const reason = REASONS.filter(r => r.code === s.draft.reason)[0];
    const plan = PLANS.filter(p => p.code === s.draft.plan)[0];

    const price = st ? st.price : 0;
    const availableCash = Math.max(0, Math.floor(m.cash));
    const limPrice = s.draft.limitPct === null || s.draft.limitPct === undefined ? price : Math.round(price * (1 + s.draft.limitPct / 100));
    const execPrice = s.draft.orderType === 'limit' ? limPrice : price;
    const byQty = s.draft.buyBy === 'qty';
    const shares = s.draft.shares || 0;
    // 주 수로 넣을 때는 주 수 × 주문 가격이 곧 주문 금액이다
    const amount = byQty ? Math.round(shares * execPrice) : s.draft.amount;
    const qty = byQty ? shares : (execPrice > 0 ? amount / execPrice : 0);
    const grand = amount;
    const overCash = grand > m.cash;
    const tooSmall = amount > 0 && qty < 0.01;
    const warn = overCash ? (byQty ? '지갑으로 살 수 있는 주 수보다 많아!' : '지갑보다 많이 살 수는 없어!')
      : tooSmall ? '이 금액으로는 아직 살 수 없어. 조금 더 올려볼까?' : '';
    const canBuy1 = amount > 0 && !overCash && !tooSmall;

    const nextOk = s.buyStep === 1 ? canBuy1
      : s.buyStep === 2 ? (!!s.draft.reason && !!s.draft.plan && (s.draft.plan !== 'plan_target' || s.draft.targetPct !== null))
      : true;

    const sentence = [reason ? reason.short : '', plan ? plan.short : ''].filter(Boolean).join(' · ');

    const cards = st === null && !s.code ? [] : [];
    const logos = u.logos || {};
    const mixW = (hx, w) => { const n = parseInt(hx.slice(1), 16); const c = [(n>>16)&255,(n>>8)&255,n&255].map(v => Math.round(v + (255 - v) * w)); return '#' + c.map(v => v.toString(16).padStart(2,'0')).join(''); };
    const rgbOf = (hx) => { const n = parseInt(hx.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); };
    // 'rank' 는 섹터가 아니라 그날 등락률 순으로 51종 전체를 보는 모드다.
    const isRank = s.sectorId === 'rank';
    // 'watch' 는 하트를 눌러 담아둔 관심 기업만 보는 모드다.
    const isWatch = s.sectorId === 'watch';
    const watch = s.watchlist || [];
    const q = (s.stockQuery || '').trim().toLowerCase();
    // 검색어가 있으면 섹터·관심 선택보다 검색이 앞선다
    const baseList = q
      ? u.stocks.filter(x => x.name.toLowerCase().indexOf(q) >= 0).sort((a, b) => b.change - a.change)
      : isRank
        ? u.stocks.slice().sort((a, b) => b.change - a.change)
        : isWatch
          ? u.stocks.filter(x => watch.indexOf(x.code) >= 0)
          : u.stocks.filter(x => x.sector === s.sectorId);
    const list = baseList.map((x, ci) => {
      const sec = this.sectorOf(x.sector);
      const active = ci === s.cardIndex;
      // 게임형 수집 카드 — 로고에서 뽑은 브랜드 색으로 프레임·글로우·차트를 물들인다
      const br = (u.brands || {})[x.code] || {};
      const B = br.color || sec.accent;          // 브랜드 색
      const BL = mixW(B, 0.45);                  // 어두운 배경 위 글자용
      const CL = x.change >= 0 ? up : down;      // 등락색 (상승 빨강 / 하락 파랑)
      // 후광은 등락색 한 계열로만 간다 — 안쪽은 밝게 타고 바깥은 같은 색의 옅은 톤으로 사라진다
      const CN = mixW(CL, 0.30);                 // 네온 심지
      const CM = mixW(CL, 0.42);                 // 중간 번짐
      const CF = mixW(CL, 0.60);                 // 바깥 안개

      // 차트 — 우하단 넓은 영역. 값과 방향은 실제 시세 그대로.
      const sp = x.spark || [], W = 127, H = 104, PL = 5, PR = 15, PY = 12, N = Math.max(2, sp.length);
      const pts = sp.map((v, i) => [PL + i * ((W - PL - PR) / (N - 1)), (H - PY) - (v / 100) * (H - PY * 2)]);
      const xy = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1));
      const last = pts[pts.length - 1] || [W - PR, H / 2];
      const priceText = x.price.toLocaleString('ko-KR');
      // 자릿수가 늘어도 차트와 부딪히지 않게 크기만 단계적으로 줄인다
      const priceFont = priceText.length >= 9 ? 24 : priceText.length === 8 ? 26 : priceText.length === 7 ? 28 : 30;

      const BI = mixW(B, 0.66);   // 설명용 아이스 톤
      const CB = mixW(CL, 0.42);  // 어두운 글래스 배지 위 등락 글자

      return {
        name: x.name, desc: x.desc, emoji: sec.emoji, category: br.cat || sec.name,
        logo: logos[x.code] || '', hasLogo: !!logos[x.code], noLogo: !logos[x.code],
        sparkLine: xy.join(' '),
        sparkArea: 'M' + xy.join(' L ') + ' L ' + (W - PR) + ',' + H + ' L ' + PL + ',' + H + ' Z',
        endX: last[0].toFixed(1), endY: last[1].toFixed(1),
        lineColor: CL, gradId: 'ar' + x.code, areaFill: 'url(#ar' + x.code + ')',
        priceText: priceText,
        changeText: (x.change >= 0 ? '▲ ' : '▼ ') + Math.abs(x.change).toFixed(2) + '%',
        brand: B,
        // 카드 바깥 래퍼 — 카드는 손대지 않고 뒤쪽에만 후광 레이어를 깐다
        // scroll-snap-stop:always — 네이티브 플링이 스냅 지점을 건너뛰지 못하게 막는다.
        slideStyle: 'position:relative;isolation:isolate;flex:none;scroll-snap-align:center;scroll-snap-stop:always;opacity:' + (active ? '1' : '0.72') + ';transition:opacity 300ms ease',
        // 주 후광 — 등락색 한 계열로만. 바깥으로 갈수록 같은 색의 옅은 톤이 되어 흰 배경에 사라진다.
        auraMain: 'position:absolute;z-index:-2;left:50%;top:50%;width:162%;height:152%;transform:translate(-50%,-50%);pointer-events:none;filter:blur(46px);opacity:' + (active ? '1' : '0') + ';transition:opacity 300ms ease;background:radial-gradient(ellipse at center,rgba(' + rgbOf(CL) + ',0.30) 0%,rgba(' + rgbOf(CL) + ',0.22) 20%,rgba(' + rgbOf(CM) + ',0.15) 38%,rgba(' + rgbOf(CM) + ',0.09) 52%,rgba(' + rgbOf(CF) + ',0.05) 66%,rgba(' + rgbOf(CF) + ',0.02) 78%,rgba(' + rgbOf(CF) + ',0) 88%)',
        // 좁은 반사광 — 네온관의 블룸. 가장자리에서 밝게 타고 여러 단계로 번져 흰 배경에 녹아든다.
        auraNeon: 'position:absolute;z-index:-1;left:-14px;top:-14px;right:-14px;bottom:-14px;border-radius:48px;pointer-events:none;filter:blur(9px);opacity:' + (active ? '1' : '0') + ';transition:opacity 300ms ease;background:radial-gradient(ellipse at 50% 46%,rgba(' + rgbOf(CN) + ',0.34) 0%,rgba(' + rgbOf(CL) + ',0.20) 44%,rgba(' + rgbOf(CL) + ',0.08) 66%,rgba(' + rgbOf(CL) + ',0) 82%);box-shadow:0 0 9px rgba(' + rgbOf(CN) + ',0.60),0 0 22px rgba(' + rgbOf(CL) + ',0.38),0 0 46px rgba(' + rgbOf(CL) + ',0.22),0 0 84px rgba(' + rgbOf(CL) + ',0.11)',
        // 차트 쪽을 조금 더 밝게 — 빛이 한쪽으로 치우쳐 자연스럽게 보이도록
        auraTrend: 'position:absolute;z-index:-1;right:-10%;bottom:2%;width:56%;height:46%;pointer-events:none;filter:blur(26px);opacity:' + (active ? '1' : '0') + ';transition:opacity 300ms ease;background:radial-gradient(ellipse at center,rgba(' + rgbOf(CN) + ',0.18) 0%,rgba(' + rgbOf(CL) + ',0.10) 38%,rgba(' + rgbOf(CM) + ',0.04) 60%,rgba(' + rgbOf(CM) + ',0) 80%)',

        // 카드 몸체 — 좌상단 브랜드 광원, 중앙은 깊게, 우하단은 검정에 가깝게
        cardStyle: 'position:relative;overflow:hidden;flex:none;width:310px;height:340px;border-radius:34px;cursor:pointer;scroll-snap-align:center;background:radial-gradient(78% 56% at 17% 3%,' + B + '5E 0%,rgba(12,18,38,0) 66%),radial-gradient(62% 48% at 97% 97%,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0) 72%),linear-gradient(146deg,#101B39 0%,#0A1024 46%,#05070E 100%);box-shadow:0 26px 50px -20px rgba(52,42,98,0.40),0 0 40px -14px ' + CL + 'B3',
        sheenStyle: 'position:absolute;left:-20%;top:-20%;right:-20%;bottom:-20%;pointer-events:none;background:linear-gradient(122deg,rgba(255,255,255,0) 34%,rgba(255,255,255,0.075) 50%,rgba(255,255,255,0) 63%)',
        // 격자는 차트 주변에서만 아주 옅게
        gridStyle: 'position:absolute;left:150px;top:212px;width:140px;height:112px;pointer-events:none;opacity:0.4;background-image:linear-gradient(' + B + '26 1px,transparent 1px),linear-gradient(90deg,' + B + '26 1px,transparent 1px);background-size:22px 22px;-webkit-mask-image:radial-gradient(75% 75% at 60% 60%,#000 0%,rgba(0,0,0,0) 78%);mask-image:radial-gradient(75% 75% at 60% 60%,#000 0%,rgba(0,0,0,0) 78%)',

        // 로고 — 배경판 없이 표면 위에 뜬 오브젝트. 흰 반사광 + 브랜드 림라이트 + 짧고 정교한 그림자.
        artStyle: 'position:absolute;left:28px;top:26px;width:88px;height:88px;display:flex;align-items:center;justify-content:center;background:' + (logos[x.code] ? 'url(' + logos[x.code] + ') center/contain no-repeat' : 'none') + ';filter:drop-shadow(0 0 1.5px rgba(255,255,255,' + (br.dark ? '0.85' : '0.55') + ')) drop-shadow(0 0 9px ' + B + 'AA) drop-shadow(0 5px 5px ' + B + '59) drop-shadow(0 7px 8px rgba(0,0,0,0.8))',

        catStyle: 'position:absolute;left:136px;top:60px;font-size:11.5px;font-weight:800;letter-spacing:0.3em;color:' + BL + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 10px ' + B,
        catBarStyle: 'position:absolute;left:136px;top:84px;pointer-events:none',
        nameStyle: 'position:absolute;left:28px;top:134px;right:28px;font-size:30px;font-weight:800;color:#F4F7FF;letter-spacing:-0.035em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 10px rgba(0,0,0,0.6),0 0 14px ' + B + '33',
        descStyle: 'position:absolute;left:28px;top:188px;right:28px;font-size:14px;font-weight:600;color:' + BI + ';line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
        priceStyle: 'position:absolute;left:28px;top:' + (270 - priceFont) + 'px;font-size:' + priceFont + 'px;font-weight:800;color:#FFFFFF;font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:-0.035em;line-height:1;text-shadow:0 3px 14px rgba(0,0,0,0.75)',
        // 등락 배지 — 어두운 반투명 글래스 캡슐. 버튼이 아니라 능력치 표시.
        changeStyle: 'position:absolute;left:28px;top:284px;display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 16px;border-radius:999px;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + CB + ';background:linear-gradient(180deg,rgba(255,255,255,0.10) 0%,rgba(0,0,0,0.42) 100%),' + CL + '26;box-shadow:inset 0 1px 0 rgba(255,255,255,0.30),inset 0 0 0 1.5px ' + CL + 'B3,0 0 18px -6px ' + CL,
        chartStyle: 'position:absolute;left:155px;top:212px;pointer-events:none',

        pick: () => { if (this.dragged) return; this.set({ code: x.code, screen: 'detail' }); }
      };
    });

    // 보유 카드의 사러/팔러 가기 버튼이 이 값을 쓰므로 그보다 먼저 선언해야 한다.
    const locked = !this.canTrade();

    const holdingCards = m.holdings.map(h => {
      const x = u.stocks.filter(y => y.code === h.code)[0];
      if (!x) return null;
      const val = x.price * h.qty, cost = h.avg * h.qty, d = val - cost;
      const pct = cost > 0 ? d / cost * 100 : 0;
      const sec = this.sectorOf(x.sector);
      return {
        name: x.name, emoji: (sec.name || '').charAt(0),
        qtyText: h.qty.toFixed(2) + '주',
        avgText: Math.round(h.avg).toLocaleString('ko-KR') + '원',
        valueText: won(val),
        pnlText: (d >= 0 ? '▲ +' : '▼ ') + Math.abs(pct).toFixed(1) + '%',
        pnlStyle: 'font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:3px;white-space:nowrap;color:' + (d >= 0 ? up : down),
        badgeStyle: 'width:40px;height:40px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:19px;background:#F4F4FA,0 0 0 1.5px ' + sec.accent + '33',
        buyStyle: 'flex:1;text-align:center;border-radius:14px;padding:12px;font-size:14.5px;font-weight:700;' + (locked
          ? 'color:#B9BDCE;cursor:not-allowed;background:#F1F2F8'
          : 'color:#01185A;cursor:pointer;background:#F1F2F8'),
        sellStyle: 'flex:1;text-align:center;border-radius:14px;padding:12px;font-size:14.5px;font-weight:700;' + (locked
          ? 'color:#E4B7CD;cursor:not-allowed;background:#FAF2F6'
          : 'color:#D5327A;cursor:pointer;background:#FDECF4'),
        buy: () => { if (locked) return; this.set({ code: x.code, screen: 'buy', buyStep: 1, draft: this.blankDraft(), showPad:false }); },
        sell: () => {
          if (locked) return;
          const order = [0,1,2,3,4];
          for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
          this.retroMs = 0; this.retroAt = null;
          this.set({ code: x.code, screen: 'sell', sellStep: 1, sellReasonOrder: order.concat([5]),
            showSellPad: false, sellQtyStr: '', sellPick: 'all',
            sellDraft: { qty: h.qty, reason:null, change:null, memo:'', memoSaved:false } });
        }
      };
    }).filter(Boolean);

    const newsItem = st && s.newsByStock ? (s.newsByStock[st.code] || null) : null;
    const newsStatus = st && s.newsStatusByStock ? (s.newsStatusByStock[st.code] || 'idle') : 'idle';
    const detailNews = s.activeNews && s.activeNewsId === s.activeNews.newsId ? s.activeNews : null;
    const heldRow = st ? (m.holdings.filter(h => h.code === st.code)[0] || null) : null;
    const heldQty = heldRow ? heldRow.qty : 0;
    const heldAvg = heldRow ? heldRow.avg : 0;
    const heldPnl = heldRow ? (price - heldAvg) * heldQty : 0;
    const heldPct = heldRow && heldAvg > 0 ? (price - heldAvg) / heldAvg * 100 : 0;
    const buyRec = st ? this.lastBuy(st.code) : null;
    const heldDays = buyRec ? Math.max(0, Math.floor((Date.now() - new Date(buyRec.ts).getTime()) / 86400000)) : 0;
    const planMatch = this.judgePlanMatch(buyRec, price);
    const isFirstSell = buyRec ? !(s.sellRecords || []).some(r => r.linked_buy_order_id === buyRec.order_id) : true;
    const showJudge = isFirstSell && planMatch !== null;
    // 매도도 매수와 같은 방식으로 넣는다 — 금액 또는 주 수, 시장가 또는 지정가
    const sellLimPct = s.sellDraft.limitPct === null || s.sellDraft.limitPct === undefined ? 0 : s.sellDraft.limitPct;
    const sellLimPrice = Math.round(price * (1 + sellLimPct / 100));
    const sellExecPrice = s.sellDraft.orderType === 'limit' ? sellLimPrice : price;
    const sellByQty = s.sellDraft.sellBy !== 'amount';
    const sellMaxQty = heldQty;
    const sellWant = sellByQty
      ? (s.sellDraft.qty || 0)
      : (sellExecPrice > 0 ? (s.sellDraft.amountInput || 0) / sellExecPrice : 0);
    const sellQty = Math.min(sellMaxQty, Math.max(0, sellWant));
    const sellProceeds = sellQty * sellExecPrice;
    const sellOver = sellWant > sellMaxQty + 0.0001;
    const sellWarn = sellOver ? '가진 것보다 많이 팔 수는 없어!'
      : (sellWant > 0 && sellQty < 0.01) ? '이 금액으로는 아직 팔 수 없어. 조금 더 올려볼까?' : '';
    const sellReason = SELL_REASONS.filter(r => r.code === s.sellDraft.reason)[0];
    const sellOk = s.sellStep === 1 ? (sellQty > 0 && !sellOver)
      : s.sellStep === 2 ? (!!s.sellDraft.reason && (!showJudge || planMatch === true || !!s.sellDraft.change))
      : true;
    const prog2 = i => 'flex:1;height:4px;border-radius:999px;background:' + (i <= s.sellStep ? '#F5327F' : '#DDDFEC');
    const devChip = on => 'flex:1;text-align:center;padding:9px 0;border-radius:10px;font-size:12.5px;font-weight:' + (on ? '800' : '600') + ';cursor:pointer;' + (on ? 'color:#fff;background:#01185A' : 'color:#6E7488;background:#F1F2F8');
    const arcTab = on => 'flex:1;text-align:center;padding:11px 0;border-radius:999px;font-size:13.5px;font-weight:' + (on ? '700' : '500') + ';cursor:pointer;white-space:nowrap;' + (on
      ? 'color:#fff;background:#01185A;box-shadow:0 6px 12px -4px rgba(1,24,90,0.4)'
      : 'color:#8E93A8');
    const myRecs = s.records.filter(r => r.user_id === (s.account === 'child' ? 'child_minji' : 'parent_mom'));
    const cnt = {};
    myRecs.forEach(r => { cnt[r.reason_code] = (cnt[r.reason_code] || 0) + 1; });
    const reasonStats = REASONS.filter(r => cnt[r.code]).map(r => ({
      emoji: r.emoji, label: r.label, n: cnt[r.code],
      pct: Math.round(cnt[r.code] / myRecs.length * 100) + '%',
      barStyle: 'width:' + Math.round(cnt[r.code] / myRecs.length * 100) + '%;height:100%;border-radius:999px;background:#F5327F'
    })).sort((a, b) => b.n - a.n);
    // 성향은 서버 엔진(BehaviorProfileSnapshot)이 계산한다. 여기서는 표시만 한다.
    const CHARACTER_CARD = {
      sniper: { name:'저격수' }, strategist: { name:'전략가' },
      challenger: { name:'승부사' }, explorer: { name:'탐험가' }
    };
    const ABILITY_ROWS = [
      { key:'accuracy', label:'정확력' }, { key:'evidence', label:'근거력' }, { key:'focus', label:'집중력' },
      { key:'diversification', label:'분산력' }, { key:'intuition', label:'직관력' }
    ];
    const profs = s.profiles || {};
    const myProf = profs[s.account] || null;
    const mySnap = myProf ? myProf.snapshot : null;
    const profLoading = s.profileStatus === 'loading' || s.profileStatus === 'idle';
    const profError = s.profileStatus === 'error';
    const isInitial = !!mySnap && mySnap.observationState === 'initial';
    const character = mySnap && !isInitial && mySnap.character ? CHARACTER_CARD[mySnap.character] : null;
    const starTextOf = grade => grade === 3 ? '★★★' : grade === 2 ? '★★☆' : grade === 1 ? '★☆☆' : '';
    // 오각형 레이더 — 위 꼭짓점부터 시계방향으로 정확력·근거력·집중력·분산력·직관력 (오른쪽 기울면 근거·집중).
    const radarPoint = (i, ratio) => {
      const angle = (-90 + i * 72) * Math.PI / 180;
      const r = 86 * Math.max(0, Math.min(1, ratio));
      return (135 + r * Math.cos(angle)).toFixed(1) + ',' + (118 + r * Math.sin(angle)).toFixed(1);
    };
    const radarRing = ratio => ABILITY_ROWS.map((row, i) => radarPoint(i, ratio)).join(' ');
    const abilityValue = key => {
      const v = mySnap ? mySnap.abilities[key] : 0;
      return typeof v === 'number' ? v : 0;
    };
    const radarData = ABILITY_ROWS.map((row, i) => radarPoint(i, abilityValue(row.key) / 10)).join(' ');
    const abilityText = row => {
      if (!mySnap) return row.label;
      if (row.key === 'accuracy' && mySnap.abilities.accuracy === null) return row.label + ' 판정 중';
      return row.label + ' ' + abilityValue(row.key);
    };
    const cmp = (a, b) => a > b ? ' > ' : a < b ? ' < ' : ' = ';
    const judgeLine = character
      ? '근거 ' + mySnap.abilities.evidence + cmp(mySnap.abilities.evidence, mySnap.abilities.intuition) + '직관 ' + mySnap.abilities.intuition
        + ' → ' + (mySnap.abilities.evidence >= mySnap.abilities.intuition ? '근거형' : '직관형')
        + ' · 집중 ' + mySnap.abilities.focus + cmp(mySnap.abilities.focus, mySnap.abilities.diversification) + '분산 ' + mySnap.abilities.diversification
        + ' → ' + (mySnap.abilities.focus >= mySnap.abilities.diversification ? '집중형' : '분산형')
      : isInitial ? '매수 기록이 3건 모이면 캐릭터가 정해져'
      : profError ? '아카이브를 나갔다 다시 들어와 봐'
      : '기록을 불러오는 중이야';
    const styleName = profLoading ? '기록 살펴보는 중…'
      : profError ? '지금은 못 불러왔어'
      : character ? (character.name + (mySnap.starGrade ? ' ' + starTextOf(mySnap.starGrade) : '')) : '아직 관찰 초기야';
    const charEmoji = character ? character.emoji : (profLoading ? '⏳' : '🌱');
    const starBadge = character && mySnap.starGrade === null ? '별 판정 중 — 사고판 지 5거래일이 지나면 채점돼' : '';
    const coachText = profLoading ? '키웅이가 기록을 살펴보고 있어…'
      : (myProf && myProf.narration && myProf.narration.text) ? myProf.narration.text
      : '기록이 모이면 이번 시즌 이야기를 들려줄게.';
    const childSnap = profs.child ? profs.child.snapshot : null;
    const parentSnap = profs.parent ? profs.parent.snapshot : null;
    const compareSide = snapX => {
      if (!snapX) return { name:'불러오는 중', star:'' };
      if (snapX.observationState === 'initial' || !snapX.character) return { name:'관찰 초기', star:'' };
      const card = CHARACTER_CARD[snapX.character];
      return { emoji: card.emoji, name: card.name, star: snapX.starGrade ? starTextOf(snapX.starGrade) : '별 판정 중' };
    };
    const compareChild = compareSide(childSnap);
    const compareParent = compareSide(parentSnap);
    const compareCell = (snapX, row) => {
      if (!snapX) return '—';
      if (row.key === 'accuracy' && snapX.abilities.accuracy === null) return '판정 중';
      const v = snapX.abilities[row.key];
      return typeof v === 'number' ? v + '점' : '—';
    };
    const compareRows = ABILITY_ROWS.map(row => ({
      label: row.label,
      childText: compareCell(childSnap, row),
      parentText: compareCell(parentSnap, row)
    }));
    const compareHeadline = childSnap && parentSnap && childSnap.character && parentSnap.character
      ? s.acc.child.name + '는 ' + CHARACTER_CARD[childSnap.character].name + ', ' + s.acc.parent.name + '는 ' + CHARACTER_CARD[parentSnap.character].name + '. '
        + (childSnap.character === parentSnap.character ? '같은 캐릭터여도 오각형 모양이 달라요.' : '스타일이 달라요.')
      : '두 사람의 기록이 모이는 중이에요.';
    const sec = st ? this.sectorOf(st.sector) : { accent:'#8E93A8' };
    const bigBadge = (size, r, f) => 'width:' + size + 'px;height:' + size + 'px;flex:none;border-radius:' + r + 'px;display:flex;align-items:center;justify-content:center;font-size:' + f + 'px;background:#F4F4FA,0 0 0 1.5px ' + sec.accent + '33';

    const prog = i => 'flex:1;height:4px;border-radius:999px;background:' + (i <= s.buyStep ? '#F5327F' : '#DDDFEC');
    const tabOn = 'font-size:13.5px;font-weight:700;padding:7px 15px;border-radius:999px;cursor:pointer;color:#fff;background:#F5327F;box-shadow:0 4px 8px -2px rgba(214,54,124,0.4)';
    const tabOff = 'font-size:13.5px;font-weight:600;padding:7px 15px;border-radius:999px;cursor:pointer;color:#8E93A8';

    const maxShares = execPrice > 0 ? Math.floor(availableCash / execPrice) : 0;
    const qtyPadKeys = ['1','2','3','4','5','6','7','8','9','←','0','00'].map(k => ({
      label: k,
      tap: () => {
        const cur = String(s.draft.shares || '');
        const v = k === '←' ? cur.slice(0, -1) : cur + k;
        this.setDraft({ shares: Math.min(maxShares, parseInt(v || '0', 10) || 0), amountSource:'custom' });
      }
    }));
    const padKeys = ['1','2','3','4','5','6','7','8','9','←','0','000'].map(k => ({
      label: k,
      tap: () => {
        const cur = String(s.draft.amount || '');
        let v;
        if (k === '←') v = cur.slice(0, -1);
        else v = cur + k;
        this.setDraft({ amount: Math.min(availableCash, parseInt(v || '0', 10) || 0), amountSource:'custom' });
      }
    }));

    return {
      isHome: s.screen === 'home', isExplore: s.screen === 'explore', isDetail: s.screen === 'detail',
      isBuy: s.screen === 'buy',
      isChart: s.screen === 'chart', isNews: s.screen === 'news',
      isPortfolio: s.screen === 'portfolio', isArchive: s.screen === 'archive',
      isBuy1: s.buyStep === 1, isBuy2: s.buyStep === 2, isBuy3: s.buyStep === 3,
      buyInProgress: s.buyStep < 3,

      meName: m.name, initial: m.name.charAt(0),
      totalAssetText: won(total), cashText: won(m.cash), navAccount: this.navItem(s.screen === 'portfolio'),
      holdCountText: m.holdings.length + '곳',
      pnlText: (pnl >= 0 ? '▲ +' : '▼ ') + Math.abs(Math.round(pnl)).toLocaleString('ko-KR') + '원',
      pnlStyle: 'font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (pnl >= 0 ? up : down),

      // 맨 앞은 섹터가 아니라 '오늘 많이 오른 순' 보기다
      sectorChips: [{ id: 'rank', name: '오늘 많이 오른 순', emoji: '' }, { id: 'watch', name: '관심 기업', emoji: '' }].concat(u.sectors).map(x => ({
        name: x.name, emoji: x.emoji,
        style: 'display:flex;align-items:center;gap:6px;flex:none;padding:11px 16px;border-radius:999px;font-size:13.5px;font-weight:' + (x.id === s.sectorId ? '700' : '500') + ';white-space:nowrap;cursor:pointer;' + (x.id === s.sectorId
          ? 'color:#fff;background:#F5327F,0 0 16px -4px rgba(245,50,127,0.55),inset 0 1.5px 1px rgba(255,255,255,0.4)'
          : 'color:#5C6280;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)'),
        pick: () => this.set({ sectorId: x.id, cardIndex: 0 })
      })),
      // 등락률 순 보기에서는 칩이 이미 무슨 목록인지 말해주므로 제목을 비운다
      sectorTitle: q ? ('\"' + s.stockQuery.trim() + '\" 검색 결과 ' + baseList.length + '곳')
        : isRank ? ''
        : isWatch ? ('관심 기업 ' + baseList.length + '곳')
        : (this.sectorOf(s.sectorId).name + ' 회사 ' + u.stocks.filter(x => x.sector === s.sectorId).length + '곳'),

      // 종목 검색
      stockQuery: s.stockQuery, hasStockQuery: !!q,
      onStockQuery: e => { const v = e.target.value; this.setState({ stockQuery: v, cardIndex: 0 }); },
      clearStockQuery: () => this.setState({ stockQuery: '', cardIndex: 0 }),
      noCards: baseList.length === 0,
      noCardsTitle: q ? '찾는 회사가 없어' : '아직 관심 기업이 없어',
      noCardsHint: q ? '이름 일부만 넣어도 찾아줄게. 예를 들면 \"삼성\"'
        : '회사를 눌러서 들어간 다음, 오른쪽 위 하트를 누르면 여기에 모여.',
      cards: list,
      // 종목이 많으면 도트가 화면을 넘친다. 현재 위치 주변만 창처럼 보여주고 양끝은 작게 흘린다.
      cardDots: (() => {
        const total = list.length, MAX = 9;
        const start = total <= MAX ? 0 : Math.min(Math.max(0, s.cardIndex - Math.floor(MAX / 2)), total - MAX);
        const shown = Math.min(MAX, total);
        return Array.from({ length: shown }, (_, k) => {
          const i = start + k;
          const on = i === s.cardIndex;
          const fadeL = total > MAX && k === 0 && start > 0;
          const fadeR = total > MAX && k === shown - 1 && start + shown < total;
          const w = on ? 18 : (fadeL || fadeR) ? 4 : 6;
          return { style: 'width:' + w + 'px;height:' + (on ? 6 : w === 4 ? 4 : 6) + 'px;border-radius:999px;transition:width .18s ease;background:' + (on ? '#FF3D8D' : (fadeL || fadeR) ? '#E3DFEE' : '#D6D0E5') + (on ? ';box-shadow:0 0 9px rgba(255,61,141,0.42)' : '') };
        });
      })(),
      cardCountText: list.length > 9 ? (Math.min(s.cardIndex + 1, list.length)) + ' / ' + list.length : '',

      // 페이지 전체가 하나의 밝은 배경 — 카드 영역에서 어두워지는 경계를 만들지 않는다
      exploreBgStyle: 'position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column;overflow:hidden;background:radial-gradient(circle at 18% 7%,rgba(225,219,255,0.34) 0%,rgba(225,219,255,0) 32%),radial-gradient(circle at 88% 92%,rgba(255,226,239,0.25) 0%,rgba(255,226,239,0) 30%),linear-gradient(180deg,#FAF9FD 0%,#F5F3FB 52%,#FAF8FC 100%)',
      // 캐러셀 영역은 투명 — 별도 배경을 두지 않는다
      stageStyle: 'position:relative;flex:1;min-height:0;display:flex;flex-direction:column;background:transparent',
      // 하단 내비 — 밝은 배경에 이어지는 반투명 글래스
      navStyleX: 'flex:none;display:flex;padding-bottom:14px;background:linear-gradient(180deg,rgba(250,248,252,0) 0%,rgba(252,251,254,0.86) 34%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.9)',
      navHomeX: this.navItemX(false), navTradeX: this.navItemX(true), navArchiveX: this.navItemX(false), navRankingX: this.navItemX(false),
      cardsRef: (el) => { this.cardsEl = el; },
      cardsScroll: (e) => {
        const el = e.currentTarget;
        const first = el.firstElementChild;
        const second = first && first.nextElementSibling;
        // 카드 간격은 슬라이드 폭 + gap 이다. 상수로 두면 gap 을 바꿀 때 어긋나므로
        // 앞 두 슬라이드의 실제 거리를 잰다.
        const step = first
          ? (second
            ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
            : first.getBoundingClientRect().width)
          : 280;
        const i = Math.max(0, Math.min(list.length - 1, Math.round(el.scrollLeft / step)));
        if (i !== this.state.cardIndex) this.setState({ cardIndex: i });
      },
      cardsDown: (e) => {
        const el = e.currentTarget;
        const startX = e.clientX, startLeft = el.scrollLeft;
        let lastX = e.clientX, lastT = (typeof performance !== 'undefined' ? performance.now() : Date.now()), v = 0;
        this.dragged = false;
        el.style.scrollSnapType = 'none';
        el.style.cursor = 'grabbing';
        const mv = ev => {
          const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
          const dt = Math.max(1, now - lastT);
          v = (ev.clientX - lastX) / dt;
          lastX = ev.clientX; lastT = now;
          if (Math.abs(ev.clientX - startX) > 6) this.dragged = true;
          el.scrollLeft = startLeft - (ev.clientX - startX);
          // 실제로 끈 뒤에만 기본 동작을 막는다. 제자리 클릭에서 막으면 카드 click 이 사라진다.
          if (this.dragged) ev.preventDefault();
        };
        const up = () => {
          window.removeEventListener('pointermove', mv);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          el.style.cursor = 'grab';
          // 관성 상한. 감쇠가 0.93 이라 관성 이동거리는 vel/(1-0.93) = vel/0.07 이다.
          // 카드 간격 343px 기준 48 이면 관성 2장이고, 마지막에 스냅이 카드 경계로 당기며
          // 최대 0.5장이 더 붙어 손을 뗀 뒤 최대 2.5장에서 멈춘다. 더 줄이려면 이 값을 낮춘다.
          let vel = -v * 16;
          if (vel > 48) vel = 48; if (vel < -48) vel = -48;
          const restore = () => { el.style.scrollSnapType = 'x mandatory'; };
          const timer = setInterval(() => {
            if (Math.abs(vel) < 0.6) { clearInterval(timer); restore(); return; }
            el.scrollLeft += vel;
            vel *= 0.93;
          }, 16);
          setTimeout(() => { clearInterval(timer); restore(); }, 1200);
          setTimeout(() => { this.dragged = false; }, 0);
        };
        // setPointerCapture 를 쓰면 click 이 카드가 아니라 캡처한 컨테이너로 재타깃돼
        // 카드 진입이 죽는다. 대신 window 리스너로 컨테이너 밖 이동까지 받는다.
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      },

      stockName: st ? st.name : '', stockEmoji: (sec.name || '').charAt(0),

      // 관심 종목 — 누르기 전 회색, 담고 나면 분홍
      watchBtnStyle: 'width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)',
      watchFill: (st && (s.watchlist || []).indexOf(st.code) >= 0) ? '#F5327F' : 'none',
      watchStroke: (st && (s.watchlist || []).indexOf(st.code) >= 0) ? '#F5327F' : '#B8BDD0',
      toggleWatch: () => {
        if (!st) return;
        const cur = this.state.watchlist || [];
        const on = cur.indexOf(st.code) >= 0;
        this.set({ watchlist: on ? cur.filter(c => c !== st.code) : cur.concat([st.code]) });
      },
      stockPriceText: st ? st.price.toLocaleString('ko-KR') + '원' : '',
      stockChangeText: st ? ((st.change >= 0 ? '▲ ' : '▼ ') + Math.abs(st.change).toFixed(2) + '%') : '',
      detailChangeStyle: 'font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (st && st.change >= 0 ? up : down),
      detailChangeStyleSm: 'font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (st && st.change >= 0 ? up : down),
      stockLineColor: st && st.change >= 0 ? up : down,
      stockSparkBig: st ? this.polyline(st.spark, 336, 112) : '',
      stockDescLong: st ? (st.name + this.topic(st.name) + ' ' + st.desc + '.') : '',
      stockNews: newsItem ? newsItem.headline : (newsStatus === 'error' ? '뉴스를 불러오지 못했어. 다시 눌러 줘.' : (newsStatus === 'empty' ? '아직 검수를 통과한 새 소식이 없어.' : '검수를 통과한 새 소식을 찾고 있어.')),
      detailBadgeStyle: bigBadge(52, 18, 25),
      miniBadgeStyle: bigBadge(38, 13, 18),

      buyStepNo: s.buyStep,
      prog1: prog(1), prog2: prog(2), prog3: prog(3),
      buyBackGlyph: s.buyStep === 1 ? '✕' : (s.buyStep === 3 ? '✕' : '‹'),
      buyInputText: (byQty ? shares : amount).toLocaleString('ko-KR'),
      buyInputUnit: byQty ? '주' : '원',
      amountWon: won(amount), totalText: won(grand),
      qtyText: qty.toFixed(2) + '주',
      // 금액으로 넣으면 몇 주가 되는지, 주 수로 넣으면 얼마가 되는지 서로 보여준다
      qtyHint: byQty
        ? (shares > 0 && st ? (Math.round(shares * execPrice)).toLocaleString('ko-KR') + '원이 들어가' : '몇 주 살지 골라봐')
        : (amount > 0 && st ? (st.name + ' 약 ' + qty.toFixed(2) + '주' + (s.draft.orderType === 'limit' ? '를 살 수 있게 돼' : '를 살 수 있어')) : '얼마를 넣을지 골라봐'),
      // 지갑과 주문 가격으로 최대 몇 주까지 살 수 있는지
      buyMaxHint: (execPrice > 0 && m.cash > 0)
        ? ('최대 ' + Math.floor(m.cash / execPrice) + '주까지 살 수 있어 · 지갑 ' + won(m.cash))
        : '',
      byAmountStyle: this.chip(!byQty), byQtyStyle: this.chip(byQty),
      pickByAmount: () => { this.setDraft({ buyBy:'amount' }); this.setState({ showPad:false }); },
      pickByQty: () => { this.setDraft({ buyBy:'qty' }); this.setState({ showPad:false }); },
      // 빠른선택과 직접 입력은 구분한다 — 직접 넣은 값이 3만원이어도 3만원 칩이 켜지지 않는다
      // 금액 칩 — 빠른선택과 직접 입력을 구분한다 (f2-trade 계약)
      chip1: this.chip(s.draft.amountSource === 'preset' && amount === 10000),
      chip3: this.chip(s.draft.amountSource === 'preset' && amount === 30000),
      chip5: this.chip(s.draft.amountSource === 'preset' && amount === 50000),
      chipC: this.chip(s.draft.amountSource === 'custom'),
      amt1: () => { this.setDraft({ amount:10000, amountSource:'preset' }); this.setState({ showPad:false }); },
      amt3: () => { this.setDraft({ amount:30000, amountSource:'preset' }); this.setState({ showPad:false }); },
      amt5: () => { this.setDraft({ amount:50000, amountSource:'preset' }); this.setState({ showPad:false }); },
      amtCustom: () => {
        this.setDraft({ amount:Math.min(availableCash, amount), amountSource:'custom' });
        this.setState(x => ({ showPad: !x.showPad }));
      },
      // 주 수 칩 — 같은 규칙을 주 수에 적용한다
      maxShares: maxShares,
      qtyChips: [1, 5, 10].map(v => ({
        label: v + '주',
        style: this.chip(s.draft.amountSource === 'preset' && shares === v),
        pick: () => { this.setDraft({ shares: Math.min(maxShares, v), amountSource:'preset' }); this.setState({ showPad:false }); }
      })).concat([{
        label: '직접', style: this.chip(s.draft.amountSource === 'custom'),
        pick: () => {
          this.setDraft({ shares: Math.min(maxShares, shares), amountSource:'custom' });
          this.setState(x => ({ showPad: !x.showPad }));
        }
      }]),
      qtyPadKeys: qtyPadKeys,
      showPad: s.showPad, padKeys: padKeys,
      buyByAmount: !byQty, buyByQty: byQty,
      buyPadKeys: byQty ? qtyPadKeys : padKeys,
      mktStyle: this.chip(s.draft.orderType === 'market'), limStyle: this.chip(s.draft.orderType === 'limit'),
      pickMarket: () => this.pickOrderType('market'),
      pickLimit: () => this.pickOrderType('limit'),
      showLimit: s.draft.orderType === 'limit',
      limitPriceText: limPrice.toLocaleString('ko-KR'),
      limitDiffText: s.draft.limitPct === 0 ? '지금 가격 그대로야' : ('지금 ' + price.toLocaleString('ko-KR') + '원보다 ' + Math.abs(s.draft.limitPct) + '% 싸'),
      limChip10: this.chip(s.draft.limitPct === -10), limChip5: this.chip(s.draft.limitPct === -5),
      limChip3: this.chip(s.draft.limitPct === -3), limChip0: this.chip(s.draft.limitPct === 0),
      lim10: () => this.setDraft({ limitPct:-10 }), lim5: () => this.setDraft({ limitPct:-5 }),
      lim3: () => this.setDraft({ limitPct:-3 }), lim0: () => this.setDraft({ limitPct:0 }),
      orderTypeText: s.draft.orderType === 'limit' ? (limPrice.toLocaleString('ko-KR') + '원이 되면') : '지금 가격에 바로',
      hasWarn: !!warn, warnText: warn,

      reasonBtns: s.reasonOrder.map(i => REASONS[i]).map(r => ({
        label: r.label,
        style: 'display:flex;flex-direction:column;align-items:center;text-align:center;padding:16px 10px;border-radius:20px;cursor:pointer;min-height:64px;justify-content:center;' + (s.draft.reason === r.code
          ? 'background:#FFF4F9;box-shadow:inset 0 0 0 2px #F5327F'
          : glass),
        pick: () => this.setDraft({ reason: r.code })
      })),

      planBtns: PLANS.map(p => ({
        label: p.label,
        style: 'display:flex;align-items:center;gap:12px;padding:16px 18px;border-radius:22px;cursor:pointer;' + (s.draft.plan === p.code
          ? 'background:#FFF4F9;box-shadow:inset 0 0 0 2px #F5327F'
          : glass),
        pick: () => this.setDraft({ plan: p.code, targetPct: p.code === 'plan_target' ? s.draft.targetPct : null })
      })),
      showTarget: s.draft.plan === 'plan_target',
      tgtChip5: this.chip(s.draft.targetPct === 5), tgtChip10: this.chip(s.draft.targetPct === 10), tgtChip20: this.chip(s.draft.targetPct === 20),
      tgt5: () => this.setDraft({ targetPct:5 }), tgt10: () => this.setDraft({ targetPct:10 }), tgt20: () => this.setDraft({ targetPct:20 }),
      targetHint: s.draft.targetPct && st ? ('지금 ' + st.price.toLocaleString('ko-KR') + '원 → 목표 ' + Math.round(st.price * (1 + s.draft.targetPct/100)).toLocaleString('ko-KR') + '원') : '몇 퍼센트 오르면 팔지 골라봐',

      answerSentence: sentence,
      buyMemo: s.draft.memo, buyMemoCount: s.draft.memo.length,
      buyMemoInput: e => { const v = e.target.value.slice(0, 50); this.setDraft({ memo: v }); },
      buyCtaLabel: s.buyStep === 2 ? '주문하기' : '다음',
      buyCtaStyle: (nextOk && !(locked && s.buyStep === 2)) ? CTA_ON : CTA_OFF,
      subCtaStyle: SUB_CTA, mainCtaStyle: 'flex:1.3;' + CTA_ON,

      // ── 3단계 · 주문을 끝낸 축하 화면 ───────────────────────────────
      doneKicker: od.limit ? '기다리는 주문에 넣었어' : '주문 완료!',
      doneHeadline: od.name
        ? (od.limit
          ? (od.limit.toLocaleString('ko-KR') + '원이 되면\n' + od.name + ' ' + odQty + '를 살게요!')
          : (od.name + ' ' + odQty + '를\n주문했어요!'))
        : '주문했어요!',
      donePraise: od.limit
        ? '값이 목표에 닿을 때까지 키웅이가 지켜볼게.\n그동안 그 돈은 잠깐 맡아둘게!'
        : '왜 샀는지까지 남긴 건 정말 잘한 거야.\n나중에 아카이브에서 오늘의 너를 다시 만나자!',
      doneStockName: od.name || '',
      doneQty: odQty,
      doneAmount: won(od.amount || 0),
      balloons: ['🎈','🎈','🎈','🎉','🎊'].map((e, i) => ({
        emoji: e,
        style: 'position:absolute;left:' + (8 + i * 21) + '%;bottom:-40px;font-size:' + (26 + (i % 3) * 7) + 'px;'
          + '--kwx:' + (i % 2 ? '' : '-') + (10 + i * 6) + 'px;'
          + 'animation:kwRise ' + (2.6 + i * 0.35) + 's ease-in ' + (i * 0.18) + 's forwards'
      })),
      confetti: Array.from({ length: 14 }, (_, i) => {
        const col = ['#F5327F','#FFC53D','#4FC3F7','#7BE3A0','#9B8CFF','#FF8AD0'][i % 6];
        return {
          style: 'position:absolute;top:-20px;left:' + (4 + i * 6.8) + '%;width:' + (7 + (i % 3) * 3) + 'px;height:'
            + (11 + (i % 4) * 3) + 'px;border-radius:2px;background:' + col + ';'
            + '--kwx:' + (i % 2 ? '' : '-') + (14 + (i % 5) * 12) + 'px;'
            + 'animation:kwFall ' + (2 + (i % 5) * 0.3) + 's linear ' + (i * 0.09) + 's forwards'
        };
      }),
      buyNext: () => {
        if (!nextOk) return;
        if (locked && s.buyStep === 2) return;
        if (s.buyStep < 2) { this.setState({ buyStep: s.buyStep + 1, showPad:false }); return; }
        const isLimit = s.draft.orderType === 'limit';
        const nm = this.state.acc[this.state.account];
        const hold = nm.holdings.slice();
        const pend = (nm.pending || []).slice();
        if (isLimit) {
          pend.push({ id: 'ord_' + String(s.seq).padStart(4, '0'), code: st.code, amount: amount, price: limPrice });
        } else {
          const idx = hold.map(h => h.code).indexOf(st.code);
          if (idx >= 0) {
            const h = hold[idx], nq = h.qty + qty;
            hold[idx] = { code: h.code, qty: nq, avg: (h.avg * h.qty + amount) / nq };
          } else {
            hold.push({ code: st.code, qty: qty, avg: price });
          }
        }
        const rec = {
          order_id: 'ord_' + String(s.seq).padStart(4, '0'),
          user_id: s.account === 'child' ? 'child_minji' : 'parent_mom',
          symbol: st.code, amount_krw: amount, qty: Math.round(qty * 10000) / 10000,
          order_type: isLimit ? 'limit' : 'market',
          limit_price: isLimit ? limPrice : null,
          order_status: isLimit ? 'pending' : 'filled',
          reason_code: s.draft.reason,
          plan_code: s.draft.plan,
          plan_target_price: s.draft.targetPct ? Math.round(price * (1 + s.draft.targetPct/100)) : null,
          memo: (s.draft.memo || '').trim() || null, ts: new Date().toISOString()
        };
        const acc2 = Object.assign({}, this.state.acc);
        acc2[this.state.account] = { name: nm.name, cash: nm.cash - grand, holdings: hold, pending: pend };
        // 축하 화면은 주문 직후 값으로 고정한다 (뒤에서 시세가 움직여도 문구가 바뀌지 않게)
        // 체결이 났으니 성향 스냅샷을 비워 다음 아카이브 진입에서 다시 계산하게 둔다
        this.set({
          acc: acc2, records: s.records.concat([rec]), seq: s.seq + 1, buyStep: 3,
          profiles: null, profileStatus: 'idle',
          orderDone: { name: st.name, qty: qty, amount: amount, limit: isLimit ? limPrice : null }
        });
        if (!isLimit) {
          this.saveTrade('buy', st.code, price, qty, s.draft.reason);
          this.notifyChatBehavior({ kind:'trade_filled', stockId:'KRX:' + st.code, side:'buy' });
        }
      },
      buyBack: () => {
        if (s.buyStep === 2 && st) this.notifyChatBehavior({ kind:'order_confirmation_cancelled', stockId:'KRX:' + st.code, side:'buy' });
        if (s.buyStep === 3) { this.set({ screen:'portfolio' }); return; }
        if (s.buyStep === 1) this.set({ screen:'detail' }); else this.setState({ buyStep: s.buyStep - 1, showPad:false });
      },


      atReport: s.arcTab === 'report' || !s.arcTab, atReturn: s.arcTab === 'return',
      atCompare: s.arcTab === 'compare', atSeason: s.arcTab === 'season',
      tabReport: () => this.set({ arcTab:'report' }), tabReturn: () => this.set({ arcTab:'return' }),
      tabCompare: () => this.set({ arcTab:'compare' }), tabSeason: () => this.set({ arcTab:'season' }),
      tabReportStyle: arcTab(!s.arcTab || s.arcTab === 'report'), tabReturnStyle: arcTab(s.arcTab === 'return'),
      tabCompareStyle: arcTab(s.arcTab === 'compare'), tabSeasonStyle: arcTab(s.arcTab === 'season'),
      styleName: styleName,
      charEmoji: charEmoji,
      judgeLine: judgeLine,
      hasStarBadge: !!starBadge, starBadge: starBadge,
      radarRingInner: radarRing(1 / 3), radarRingMid: radarRing(2 / 3),
      radarOutline: radarRing(1), radarData: radarData,
      abilityText0: abilityText(ABILITY_ROWS[0]), abilityText1: abilityText(ABILITY_ROWS[1]),
      abilityText2: abilityText(ABILITY_ROWS[2]), abilityText3: abilityText(ABILITY_ROWS[3]),
      abilityText4: abilityText(ABILITY_ROWS[4]),
      hasReasons: reasonStats.length > 0, noReasons: reasonStats.length === 0,
      reasonStats: reasonStats,
      coachText: coachText,
      pnlPctText: (pnl >= 0 ? '+' : '') + (pnl / SEED * 100).toFixed(2) + '%',
      pnlPctStyle: 'font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (pnl >= 0 ? up : down),
      childName: s.acc.child.name, parentName: s.acc.parent.name,
      compareChildEmoji: compareChild.emoji, compareChildName: compareChild.name, compareChildStar: compareChild.star,
      compareParentEmoji: compareParent.emoji, compareParentName: compareParent.name, compareParentStar: compareParent.star,
      compareRows: compareRows,
      compareHeadline: compareHeadline,
      badgeCount: s.badges || 0,
      sellCount: (s.sellRecords || []).length,
      memoRecordCount: s.records.filter(r => r.memo).length + (s.sellRecords || []).filter(r => r.memo).length,
      detailViewCount: (s.events || []).filter(e => e.event === 'chart_detail_opened' || e.event === 'news_detail_opened' || e.event === 'info_detail_opened').length,

      isRanking: s.screen === 'ranking',
      // 랭킹 화면만 상단이 남색이라 상태바 아이콘을 흰색으로 바꾼다.
      statusDark: 'position:absolute;left:0;top:0;z-index:3;pointer-events:none;display:' + (s.screen === 'ranking' ? 'none' : 'block'),
      statusLight: 'position:absolute;left:0;top:0;z-index:3;pointer-events:none;display:' + (s.screen === 'ranking' ? 'block' : 'none'),
      goRanking: () => this.set({ screen:'ranking' }),
      navRanking: this.navItem(s.screen === 'ranking'),
      rkHeadStyle: 'flex:none;position:relative;height:416px;border-radius:0 0 48px 48px;overflow:hidden;'
        + 'background:radial-gradient(125% 100% at 50% 8%,#2A5FC4 0%,#123B8E 38%,#0B2A6B 68%,#01185A 100%)',
      rkBackStyle: 'position:absolute;left:18px;top:65px;width:38px;height:38px;border-radius:999px;background:rgba(255,255,255,0.14);'
        + 'display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;line-height:1;padding-bottom:3px;'
        + 'box-sizing:border-box;cursor:pointer',
      rkTitleStyle: 'position:absolute;left:0;right:0;top:65px;height:38px;display:flex;align-items:center;justify-content:center;gap:7px;'
        + 'font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em',
      rkSegWrap: 'position:absolute;left:78px;top:117px;width:246px;height:40px;box-sizing:border-box;border-radius:20px;'
        + 'background:rgba(0,0,0,0.26);display:flex;padding:4px;gap:6px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3)',
      rkSegWeek: this.rkSeg(rankTab === 'week'),
      rkSegSeason: this.rkSeg(rankTab === 'season'),
      pickWeek: () => this.setState({ rankTab:'week' }),
      pickSeason: () => this.setState({ rankTab:'season' }),
      rkConeStyle: 'position:absolute;left:135px;top:150px;width:132px;height:192px;pointer-events:none;filter:blur(7px);'
        + 'clip-path:polygon(34% 0%,66% 0%,100% 100%,0% 100%);'
        + 'background:linear-gradient(180deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.07) 56%,rgba(255,255,255,0) 100%)',
      rkGroundStyle: 'position:absolute;left:26px;top:383px;width:350px;height:12px;border-radius:999px;filter:blur(2px);'
        + 'background:radial-gradient(closest-side,rgba(0,0,0,0.42) 0%,rgba(0,0,0,0) 78%)',
      podium: rkPodium(rankTab),
      rankRows: rkRows(rankTab, up, down),

      isSell: s.screen === 'sell',
      isSell1: s.sellStep === 1, isSell2: s.sellStep === 2, isSell3: s.sellStep === 3,
      sellInProgress: s.sellStep < 3,
      sellStepNo: s.sellStep,
      sProg1: prog2(1), sProg2: prog2(2), sProg3: prog2(3),
      sellBackGlyph: s.sellStep === 1 ? '✕' : (s.sellStep === 3 ? '✕' : '‹'),
      holdQtyText: heldQty.toFixed(2) + '주', holdAvgText: Math.round(heldAvg).toLocaleString('ko-KR') + '원',
      holdValueText: won(heldQty * price),
      holdPnlText: (heldPnl >= 0 ? '▲ +' : '▼ ') + Math.abs(Math.round(heldPnl)).toLocaleString('ko-KR') + '원',
      holdPnlStyle: 'font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:5px;white-space:nowrap;color:' + (heldPnl >= 0 ? up : down),

      // ── 1단계 · 얼마나 팔까 (매수 1단계와 같은 방식) ────────────────
      sellByQtyStyle: this.chip(sellByQty), sellByAmountStyle: this.chip(!sellByQty),
      pickSellByQty: () => { this.setSell({ sellBy:'qty' }); this.setState({ showSellPad:false }); },
      pickSellByAmount: () => { this.setSell({ sellBy:'amount' }); this.setState({ showSellPad:false }); },
      sellInputText: sellByQty
        ? (Math.round((s.sellDraft.qty || 0) * 100) / 100).toString()
        : (s.sellDraft.amountInput || 0).toLocaleString('ko-KR'),
      sellInputUnit: sellByQty ? '주' : '원',
      sellHint: sellQty > 0
        ? (won(sellProceeds) + '을 받게 돼')
        : (sellByQty ? '몇 주 팔지 골라봐' : '얼마어치 팔지 골라봐'),
      sellMaxHint: sellMaxQty > 0
        ? ('최대 ' + (Math.floor(sellMaxQty * 100) / 100) + '주까지 팔 수 있어 · ' + won(sellMaxQty * sellExecPrice))
        : '',
      sellQtyText: sellQty.toFixed(2),
      sellProceedsText: won(sellProceeds),
      sellOrderTypeText: s.sellDraft.orderType === 'limit' ? (sellLimPrice.toLocaleString('ko-KR') + '원이 되면') : '지금 가격에 바로',
      sellChips: (sellByQty
        ? [{ k:'all', label:'전부', v: sellMaxQty }, { k:'half', label:'절반', v: sellMaxQty / 2 }]
        : [{ k:'a3', label:'3만원', v: 30000 }, { k:'a5', label:'5만원', v: 50000 }]
      ).map(c => ({
        label: c.label,
        style: this.chip(s.sellPick === c.k),
        pick: () => {
          this.setState({ sellPick: c.k, showSellPad:false, sellQtyStr:'' });
          this.setSell(sellByQty ? { qty: c.v } : { amountInput: Math.min(c.v, Math.round(sellMaxQty * sellExecPrice)) });
        }
      })).concat([{
        label: '직접', style: this.chip(s.sellPick === 'custom'),
        pick: () => {
          this.setState({ sellPick:'custom', showSellPad:true, sellQtyStr:'' });
          this.setSell(sellByQty ? { qty: 0 } : { amountInput: 0 });
        }
      }]),
      showSellPad: !!s.showSellPad,
      sellPadKeys: (sellByQty ? ['1','2','3','4','5','6','7','8','9','.','0','←'] : ['1','2','3','4','5','6','7','8','9','←','0','000']).map(k => ({
        label: k,
        tap: () => {
          if (!sellByQty) {
            const cur = String(s.sellDraft.amountInput || '');
            const v = k === '←' ? cur.slice(0, -1) : cur + k;
            this.setSell({ amountInput: Math.min(Math.round(sellMaxQty * sellExecPrice), parseInt(v || '0', 10) || 0) });
            return;
          }
          const cur = s.sellQtyStr || '';
          let v;
          if (k === '←') v = cur.slice(0, -1);
          else if (k === '.') v = cur.indexOf('.') >= 0 ? cur : (cur === '' ? '0.' : cur + '.');
          else v = cur + k;
          this.setState({ sellQtyStr: v });
          this.setSell({ qty: parseFloat(v || '0') || 0 });
        }
      })),
      sellMktStyle: this.chip(s.sellDraft.orderType !== 'limit'),
      sellLimStyle: this.chip(s.sellDraft.orderType === 'limit'),
      pickSellMarket: () => this.setSell({ orderType:'market' }),
      pickSellLimit: () => this.setSell({ orderType:'limit' }),
      showSellLimit: s.sellDraft.orderType === 'limit',
      sellLimitPriceText: sellLimPrice.toLocaleString('ko-KR'),
      sellLimitDiffText: sellLimPct === 0 ? '지금 값 그대로야' : ('지금보다 ' + sellLimPct + '% 높은 값이야'),
      // 팔 때는 지금보다 높은 값을 기다린다
      sellLimitChips: [0, 3, 5, 10].map(v => ({
        label: v === 0 ? '지금값' : ('+' + v + '%'),
        style: this.chip(sellLimPct === v),
        pick: () => this.setSell({ limitPct: v })
      })),
      hasSellWarn: !!sellWarn, sellWarnText: sellWarn,

      // ── 2단계 · 사던 날의 기록 + 왜 파는지 ──────────────────────────
      retroAgoText: heldDays === 0 ? '오늘의 나' : (heldDays + '일 전의 나'),
      retroSentence: buyRec ? ([
        (REASONS.filter(r => r.code === buyRec.reason_code)[0] || {}).short,
        (PLANS.filter(p => p.code === buyRec.plan_code)[0] || {}).short
      ].filter(Boolean).join(',\n') + ' 샀어.') : '기록이 없어.',
      // 매수 때 남긴 것들을 그대로 다시 보여준다
      retroRows: buyRec ? [
        { label: '산 날', value: (d => (d.getMonth() + 1) + '월 ' + d.getDate() + '일')(new Date(buyRec.ts)) },
        { label: '산 만큼', value: (Math.round(buyRec.qty * 100) / 100) + '주 · ' + won(buyRec.amount_krw) },
        { label: '왜 샀는지', value: (REASONS.filter(r => r.code === buyRec.reason_code)[0] || {}).label || '기록 없음' },
        { label: '언제까지', value: (PLANS.filter(p => p.code === buyRec.plan_code)[0] || {}).label || '기록 없음' }
      ].concat(buyRec.plan_target_price ? [{ label: '목표 가격', value: won(buyRec.plan_target_price) }] : [])
       .concat(buyRec.memo ? [{ label: '그때 한 말', value: buyRec.memo }] : []) : [],
      hasRetroMemo: !!(buyRec && buyRec.memo), retroMemo: buyRec ? buyRec.memo : '',
      retroPnlText: (heldPct >= 0 ? '+' : '') + heldPct.toFixed(1) + '%',
      retroHeldText: heldDays === 0 ? '오늘' : (heldDays + '일'),

      sellReasonBtns: s.sellReasonOrder ? s.sellReasonOrder.map(i => SELL_REASONS[i]).map(r => ({
        label: r.label,
        style: 'display:flex;flex-direction:column;align-items:center;text-align:center;padding:16px 10px;border-radius:20px;cursor:pointer;min-height:64px;justify-content:center;' + (s.sellDraft.reason === r.code
          ? 'background:#FFF4F9;box-shadow:inset 0 0 0 2px #F5327F'
          : glass),
        pick: () => this.setSell({ reason: r.code })
      })) : [],

      planMatched: showJudge && planMatch === true, planChanged: showJudge && planMatch === false,
      hasBadgeNow: showJudge && planMatch === true,
      changeQuestion: buyRec ? ('처음에는 ' + ((PLANS.filter(p => p.code === buyRec.plan_code)[0] || {}).short || '') + ' 가지려고 했었네. 무엇이 달라졌어?') : '무엇이 달라졌어?',
      changeBtns: CHANGES.map(c => ({
        label: c.label,
        style: 'display:flex;align-items:center;gap:12px;padding:15px 17px;border-radius:22px;cursor:pointer;' + (s.sellDraft.change === c.code
          ? 'background:#FFF4F9;box-shadow:inset 0 0 0 2px #F5327F'
          : glass),
        pick: () => this.setSell({ change: c.code })
      })),

      sellSentence: sellReason ? (sellReason.short + ' 팔기로 했어') : '',
      sellCtaLabel: s.sellStep === 2 ? '팔기' : '다음',
      sellCtaStyle: (sellOk && !(locked && s.sellStep === 2)) ? CTA_ON : CTA_OFF,

      // ── 3단계 · 매도 완료 (축하 연출 없음) ──────────────────────────
      sellDoneKicker: sd.limit ? '기다리는 주문에 넣었어' : '매도 완료',
      sellDoneHeadline: sd.name
        ? (sd.limit
          ? (sd.limit.toLocaleString('ko-KR') + '원이 되면\n' + sd.name + ' ' + sdQty + '를 팔게요')
          : (sd.name + ' ' + sdQty + '를\n팔았어요'))
        : '팔았어요',
      sellDoneNote: sd.limit
        ? '값이 목표에 닿을 때까지 키웅이가 지켜볼게.\n그동안 그 주식은 잠깐 맡아둘게.'
        : '왜 팔았는지까지 남겨뒀어.\n아카이브에서 산 날과 판 날을 같이 볼 수 있어.',
      sellDoneStock: sd.name || '',
      sellDoneQty: sdQty,
      sellDoneMoneyLabel: sd.limit ? '받게 될 돈' : '받은 돈',
      sellDoneProceeds: won(sd.proceeds || 0),
      hasBadge: !!sd.badge,
      sellMemo: s.sellDraft.memo, sellMemoCount: s.sellDraft.memo.length,
      sellMemoInput: e => { const v = e.target.value.slice(0, 50); this.setSell({ memo: v, memoSaved: false }); },
      sellMemoBtnLabel: s.sellDraft.memoSaved ? '저장됐어 ✓' : '저장하기',
      sellMemoBtnStyle: s.sellDraft.memoSaved
        ? 'font-size:14px;font-weight:700;color:#8E93A8;padding:11px 18px;border-radius:999px;white-space:nowrap;background:#F1F2F8'
        : 'font-size:14px;font-weight:700;color:#fff;padding:11px 20px;border-radius:999px;cursor:pointer;white-space:nowrap;background:#F5327F',
      saveSellMemo: () => {
        if (s.sellDraft.memoSaved) return;
        const v = (s.sellDraft.memo || '').trim();
        this.setState(x => {
          const recs = (x.sellRecords || []).slice();
          if (recs.length) recs[recs.length - 1] = Object.assign({}, recs[recs.length - 1], { memo: v || null });
          const n = Object.assign({}, x, {
            sellRecords: recs,
            sellDraft: Object.assign({}, x.sellDraft, { memoSaved: true })
          });
          this.persist(n); return n;
        });
      },

      sellBack: () => {
        if (s.sellStep === 2 && st) this.notifyChatBehavior({ kind:'order_confirmation_cancelled', stockId:'KRX:' + st.code, side:'sell' });
        if (s.sellStep === 3) { this.set({ screen:'portfolio' }); return; }
        if (s.sellStep === 1) this.set({ screen:'portfolio' }); else this.setState({ sellStep: s.sellStep - 1 });
      },
      sellNext: () => {
        if (!sellOk) return;
        if (locked && s.sellStep === 2) return;
        if (s.sellStep === 1) { this.retroAt = Date.now(); this.setState({ sellStep: 2 }); return; }
        this.retroMs = this.retroAt ? Date.now() - this.retroAt : 0;
        const isLimit = s.sellDraft.orderType === 'limit';
        const nm = this.state.acc[this.state.account];
        const hold = nm.holdings.slice();
        const pend = (nm.pending || []).slice();
        // 시장가든 지정가든 파는 주식은 바로 보유에서 빼둔다 (지정가는 예약으로 잡힌다)
        const idx = hold.map(h => h.code).indexOf(st.code);
        if (idx >= 0) {
          const left = hold[idx].qty - sellQty;
          if (left < 0.005) hold.splice(idx, 1); else hold[idx] = { code: hold[idx].code, qty: left, avg: hold[idx].avg };
        }
        if (isLimit) pend.push({ id: 'ord_' + String(s.seq).padStart(4, '0'), code: st.code, side: 'sell', qty: sellQty, price: sellLimPrice });
        const rec = {
          order_id: 'ord_' + String(s.seq).padStart(4, '0'),
          user_id: s.account === 'child' ? 'child_minji' : 'parent_mom',
          symbol: st.code, qty: Math.round(sellQty * 10000) / 10000,
          linked_buy_order_id: buyRec ? buyRec.order_id : null,
          order_type: isLimit ? 'limit' : 'market',
          limit_price: isLimit ? sellLimPrice : null,
          order_status: isLimit ? 'pending' : 'filled',
          sell_reason_code: s.sellDraft.reason,
          plan_match: planMatch,
          change_reason_code: (showJudge && planMatch === false) ? s.sellDraft.change : null,
          badge_awarded: showJudge && planMatch === true,
          retro_card_viewed_ms: this.retroMs || 0,
          pnl_pct_at_sell: Math.round(heldPct * 10) / 10,
          held_days: heldDays, avg: heldAvg, memo: null, ts: new Date().toISOString()
        };
        const acc2 = Object.assign({}, this.state.acc);
        acc2[this.state.account] = {
          name: nm.name, cash: nm.cash + (isLimit ? 0 : sellProceeds), holdings: hold, pending: pend
        };
        this.set({
          acc: acc2, sellRecords: (s.sellRecords || []).concat([rec]),
          badges: s.badges + ((showJudge && planMatch === true) ? 1 : 0),
          seq: s.seq + 1, sellStep: 3,
          profiles: null, profileStatus: 'idle',
          sellDraft: Object.assign({}, s.sellDraft, { memo:'', memoSaved:false }),
          sellDone: { name: st.name, qty: sellQty, proceeds: sellProceeds, limit: isLimit ? sellLimPrice : null, badge: showJudge && planMatch === true }
        });
        if (isLimit) return;
        this.saveTrade('sell', st.code, price, sellQty, s.sellDraft.reason, null);
        const behaviorEvent = { kind:'trade_filled', stockId:'KRX:' + st.code, side:'sell' };
        if (heldRow && Number.isFinite(heldAvg) && heldAvg > 0 && Number.isFinite(price)) {
          behaviorEvent.realizedPnlPct = (price - heldAvg) / heldAvg * 100;
        }
        this.notifyChatBehavior(behaviorEvent);
      },

      hasPending: (m.pending || []).length > 0,
      pendingCards: (m.pending || []).map(p => {
        const x = u.stocks.filter(y => y.code === p.code)[0];
        return {
          name: x ? x.name : p.code,
          desc: p.price.toLocaleString('ko-KR') + '원이 되면 ' + won(p.amount) + ' 어치',
          cancel: () => {
            const nm2 = this.state.acc[this.state.account];
            const acc3 = Object.assign({}, this.state.acc);
            acc3[this.state.account] = {
              name: nm2.name, cash: nm2.cash + p.amount, holdings: nm2.holdings,
              pending: (nm2.pending || []).filter(q => q.id !== p.id)
            };
            this.set({ acc: acc3 });
            this.notifyChatBehavior({ kind:'order_confirmation_cancelled', stockId:'KRX:' + p.code, side:'buy' });
          }
        };
      }),

      hasHoldings: holdingCards.length > 0, noHoldings: holdingCards.length === 0,
      holdingCards: holdingCards,
      recordCount: s.records.length,

      backBtnStyle: 'width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)',
      stepPillStyle: 'min-width:58px;text-align:center;border-radius:999px;padding:8px 12px;font-size:14.5px;font-weight:700;font-variant-numeric:tabular-nums;color:#A9AEC4;background:#F1F2F8',

      navStyle: 'flex:none;display:flex;padding-bottom:14px;background:linear-gradient(180deg,rgba(245,242,248,0) 0%,#F5F2F8 34%);box-shadow:0 -1px 0 rgba(1,24,90,0.06)',
      navHome: this.navItem(s.screen === 'home'),
      navTrade: this.navItem(s.screen === 'explore' || s.screen === 'detail' || s.screen === 'buy'),
      navArchive: this.navItem(s.screen === 'archive'),
      navAccount: this.navItem(s.screen === 'portfolio'),

      tradeLocked: locked, tradeOpen: !locked,
      isParentAcct: s.account === 'parent',
      schoolLockOn: !!s.schoolLock,
      lockToggleStyle: s.schoolLock
        ? 'width:52px;height:30px;border-radius:999px;flex:none;cursor:pointer;position:relative;background:#F5327F'
        : 'width:52px;height:30px;border-radius:999px;flex:none;cursor:pointer;position:relative;background:#DDDFEC;box-shadow:inset 0 2px 4px rgba(70,60,120,0.18)',
      lockKnobStyle: 'position:absolute;top:3px;left:' + (s.schoolLock ? '25px' : '3px') + ';width:24px;height:24px;border-radius:999px;background:#fff;box-shadow:0 3px 6px rgba(35,25,80,0.28);transition:left .16s ease',
      toggleLock: () => this.set({ schoolLock: !s.schoolLock }),
      schoolStateText: this.isSchoolTime() ? '지금은 학교 시간' : '지금은 매매할 수 있는 시간',
      forceAuto: () => this.set({ forceSchool:'auto' }),
      forceOn: () => this.set({ forceSchool:'on' }),
      forceOff: () => this.set({ forceSchool:'off' }),
      forceAutoStyle: devChip(s.forceSchool === 'auto'), forceOnStyle: devChip(s.forceSchool === 'on'), forceOffStyle: devChip(s.forceSchool === 'off'),
      moreBtnStyle: 'font-size:13px;font-weight:700;color:#01185A;padding:9px 14px;border-radius:999px;cursor:pointer;white-space:nowrap;background:#F1F2F8',
      newsMoreLabel: newsItem ? '뉴스 자세히 보기' : (newsStatus === 'error' ? '다시 불러오기' : (newsStatus === 'empty' ? '새 소식 없음' : '불러오는 중')),
      newsMoreBtnStyle: 'font-size:13px;font-weight:700;color:#01185A;padding:9px 14px;border-radius:999px;white-space:nowrap;background:radial-gradient(ellipse 64% 56% at 50% -6%,rgba(255,255,255,1) 0%,rgba(255,255,255,0.5) 44%,rgba(255,255,255,0) 86%),linear-gradient(180deg,#FCFCFE 0%,#F4F5FB 36%,#EBEDF7 70%,#E2E5F1 100%);box-shadow:0 7px 12px -5px rgba(35,25,80,0.2),inset 0 -8px 13px -7px rgba(255,255,255,0.9),inset 0 1.5px 2px rgba(255,255,255,1);cursor:' + (newsItem || newsStatus === 'error' ? 'pointer' : 'default') + ';opacity:' + (newsItem || newsStatus === 'error' ? '1' : '0.58'),
      ctaStyle: locked ? CTA_OFF : CTA_ON,
      openChart: () => { this.bumpTabCount(); this.logEvent('chart_detail_opened', 'chart'); },
      openNews: () => { if (newsItem) this.openNewsItem(newsItem); else if (st && newsStatus === 'error') this.loadNews(st.code); },
      closeSub: () => this.closeSub(),
      chartLine: () => this.setChartType('line'), chartCandle: () => this.setChartType('candlestick'),
      chartLineStyle: this.chip(s.chartType === 'line'), chartCandleStyle: this.chip(s.chartType === 'candlestick'),
      tfMinute: () => this.setTf('minute'), tfDaily: () => this.setTf('daily'), tfWeekly: () => this.setTf('weekly'),
      tfMinuteStyle: this.chip(s.tf === 'minute'), tfDailyStyle: this.chip(s.tf === 'daily'), tfWeeklyStyle: this.chip(s.tf === 'weekly'),
      // 종목만 주소에 남긴다. 기간·차트종류가 주소에 있으면 탭을 누를 때마다 iframe 문서가
      // 통째로 다시 열려 차트 번들과 데이터를 다시 받는다. 두 값은 postChartOptions 로 넘긴다.
      tradingViewChartUrl: st ? '/tradingview-chart?symbol=' + encodeURIComponent(st.code) : '',
      sectorNameText: st ? this.sectorOf(st.sector).name : '',
      newsKicker: detailNews ? (st ? st.name + ' 이야기' : '기업 이야기') : '',
      newsHeadline: detailNews ? detailNews.headline : '',
      newsLines: detailNews ? detailNews.summaryLines.map((t, i) => ({
        text: t, n: i + 1,
        numStyle: 'width:22px;height:22px;flex:none;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;background:#F5327F;box-shadow:0 4px 8px -2px rgba(214,54,124,0.4)'
      })) : [],
      newsSourceText: detailNews ? detailNews.publisher + ' · ' + this.formatNewsDate(detailNews.sourcePublishedAt) : '',
      openNewsSource: () => { if (detailNews && this.validNewsItem(detailNews, st ? st.code : '')) window.location.assign(detailNews.sourceUrl); },

      goHome: () => this.set({ screen:'home' }),
      goExplore: () => this.set({ screen:'explore' }),
      goPortfolio: () => this.set({ screen:'portfolio' }),
      goArchive: () => { this.set({ screen:'archive' }); this.loadProfiles(); },
      startBuy: () => { if (locked) return; this.set({ screen:'buy', buyStep:1, draft:this.blankDraft(), showPad:false }); },
      resetAll: () => {
        const fresh = seedAccounts();
        this.set({ acc: fresh, records: [], events: [], sellRecords: [], badges: 0, seq: 1, screen:'home', draft: this.blankDraft() , watchlist: [] });
      }
    };
  }
}
