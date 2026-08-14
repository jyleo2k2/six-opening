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
    const arc = this.buildArchive();
    // 아카이브 성향 카드는 유형별 팔레트를 쓴다. arcInk 는 그 팔레트의 가장 진한 색.
    const arcPal = arc.pal, arcInk = arc.ink;
    const arcRgba = a => { const n = parseInt(arcInk.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
    const arcHasPick = typeof s.traitPick === 'number';
    const arcPicked = arcHasPick ? arc.traits[Math.min(s.traitPick, arc.traits.length - 1)] : arc.traits[0];
    const arcWrap = t => (t || '').replace(/\s*\n\s*/g, ' ').replace(/(다|어|야|요)\.\s+/g, '$1.\n');
    const arcTab = on => 'flex:1;text-align:center;padding:11px 0;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all 0.18s;' + (on
      ? 'color:#fff;background:#001E5A'
      : 'color:#7C819A;background:#EAEBF3');
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

