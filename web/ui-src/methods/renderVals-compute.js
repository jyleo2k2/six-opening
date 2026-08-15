  renderVals(){
    const s = this.state, m = this.me(), st = this.stock(), u = this.uni();
    const total = this.totalAsset(), pnl = total - SEED;
    const up = '#E8322E', down = '#1668DC';
    // 홈 화면은 React(`HomeScreen`)로 옮겨 갔다. 역할별 인사말·목표·보유 계산은
    // `features/f0-home/lib/home-view.ts` 가 소유한다.
    // 주문 직후 값 — 매수 3단계 축하 화면과 매도 3단계 완료 화면이 이걸로 문구를 만든다
    const od = s.orderDone || {};
    const odQty = od.scheduled && od.requestMode === 'amount'
      ? '시가 확인 뒤 결정'
      : (od.qty === undefined ? '' : ((Math.round(od.qty * 100) / 100) + '주'));
    const sd = s.sellDone || {};
    const sdQty = sd.qty === undefined ? '' : ((Math.round(sd.qty * 100) / 100) + '주');
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
    const marketOpen = isRegularMarketOpen(new Date());
    const scheduledFor = nextOpeningDate(new Date());
    const overCash = grand > m.cash;
    const tooSmall = amount > 0 && qty < 0.01;
    const warn = overCash ? (byQty ? '지갑으로 살 수 있는 주 수보다 많아!' : '지갑보다 많이 살 수는 없어!')
      : tooSmall ? '이 금액으로는 아직 살 수 없어. 조금 더 올려볼까?' : '';
    const canBuy1 = amount > 0 && !overCash && !tooSmall;

    const nextOk = s.buyStep === 1 ? canBuy1
      : s.buyStep === 2 ? (!!s.draft.reason && !!s.draft.plan && (s.draft.plan !== 'plan_target' || s.draft.targetPct !== null))
      : true;

    const sentence = [reason ? reason.short : '', plan ? plan.short : ''].filter(Boolean).join(' · ');

    // 탐색 카드 목록은 React(`ExploreScreen`)로 옮겨 갔다. 로고는 배지·이모지 판정에 여전히 쓴다.
    const logos = u.logos || {};

    // 보유 카드의 사러/팔러 가기 버튼이 이 값을 쓰므로 그보다 먼저 선언해야 한다.
    const locked = !this.canTrade();

    const holdingCards = m.holdings.map(h => {
      const x = u.stocks.filter(y => y.code === h.code)[0];
      if (!x) return null;
      const val = x.price * h.qty, cost = h.avg * h.qty, d = val - cost;
      const pct = cost > 0 ? d / cost * 100 : 0;
      const sec = this.sectorOf(x.sector);
      const reservedQty = reservedSellQty(m.pending || [], h.code);
      const availableQty = Math.max(0, h.qty - reservedQty);
      return {
        name: x.name, emoji: (sec.name || '').charAt(0),
        qtyText: h.qty.toFixed(2) + '주' + (reservedQty > 0 ? ' · ' + reservedQty.toFixed(2) + '주 예약' : ''),
        avgText: Math.round(h.avg).toLocaleString('ko-KR') + '원',
        valueText: won(val),
        pnlText: (d >= 0 ? '▲ +' : '▼ ') + Math.abs(pct).toFixed(1) + '%',
        pnlStyle: 'font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:3px;white-space:nowrap;color:' + (d >= 0 ? up : down),
        badgeStyle: 'width:40px;height:40px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:19px;background:#F4F4FA,0 0 0 1.5px ' + sec.accent + '33',
        buyStyle: 'flex:1;text-align:center;border-radius:14px;padding:12px;font-size:14.5px;font-weight:700;' + (locked
          ? 'color:#B9BDCE;cursor:not-allowed;background:#F1F2F8'
          : 'color:#01185A;cursor:pointer;background:#F1F2F8'),
        sellStyle: 'flex:1;text-align:center;border-radius:14px;padding:12px;font-size:14.5px;font-weight:700;' + (locked || availableQty < 0.01
          ? 'color:#E4B7CD;cursor:not-allowed;background:#FAF2F6'
          : 'color:#D5327A;cursor:pointer;background:#FDECF4'),
        buy: () => { if (locked) return; this.set({ code: x.code, screen: 'buy', buyStep: 1, draft: this.blankDraft(), showPad:false }); },
        sell: () => {
          if (locked || availableQty < 0.01) return;
          const order = [0,1,2,3,4];
          for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
          this.retroMs = 0; this.retroAt = null;
          this.set({ code: x.code, screen: 'sell', sellStep: 1, sellReasonOrder: order.concat([5]),
            showSellPad: false, sellQtyStr: '', sellPick: 'all',
            sellDraft: { qty: availableQty, reason:null, change:null, memo:'', memoSaved:false } });
        }
      };
    }).filter(Boolean);

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
    const sellReservedQty = reservedSellQty(m.pending || [], st ? st.code : '');
    const sellMaxQty = Math.max(0, heldQty - sellReservedQty);
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

