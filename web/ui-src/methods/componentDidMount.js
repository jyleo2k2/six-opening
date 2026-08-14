  processScheduledOrders(){
    if (this.scheduledOrdersBusy) return;
    if (this.scheduledOrdersLastCheck && Date.now() - this.scheduledOrdersLastCheck < 15000) return;
    const accountKey = this.state.account;
    const account = this.state.acc[accountKey];
    const orders = (account.pending || []).filter(order => order.kind === 'next_open');
    if (!orders.length) return;
    this.scheduledOrdersBusy = true;
    this.scheduledOrdersLastCheck = Date.now();
    const codes = Array.from(new Set(orders.map(order => order.code)));
    Promise.all(codes.map(code => fetch('/api/quote/' + encodeURIComponent(code) + '/chart?period=daily', { cache:'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(payload => [code, payload && Array.isArray(payload.points) ? payload.points : []])
      .catch(() => [code, []])))
      .then(entries => {
        const charts = {};
        entries.forEach(entry => { charts[entry[0]] = entry[1]; });
        const state = this.state;
        const current = state.acc[accountKey];
        if (!current) return;
        const effects = [];
        let nextAccount = current;
        let nextRecords = state.records || [];
        let nextSellRecords = state.sellRecords || [];
        (current.pending || []).filter(order => order.kind === 'next_open').forEach(order => {
          const opening = findConfirmedOpeningCandle(charts[order.code] || [], order.scheduledFor, new Date());
          if (!opening) return;
          const result = settleScheduledOrder({
            account: nextAccount, records: nextRecords, sellRecords: nextSellRecords,
            order: order, candle: opening, now: new Date()
          });
          nextAccount = result.account;
          nextRecords = result.records;
          nextSellRecords = result.sellRecords;
          if (result.effect) effects.push(result.effect);
        });
        if (!effects.length) return;
        const acc = Object.assign({}, state.acc, { [accountKey]: nextAccount });
        const patch = { acc:acc, records:nextRecords, sellRecords:nextSellRecords };
        this.persist(Object.assign({}, state, patch));
        this.setState(patch, () => {
          effects.filter(effect => effect.type === 'filled').forEach(effect => {
            this.saveTrade(effect.side, effect.code, effect.price, effect.qty, effect.reason);
            if (effect.side === 'buy') this.flushTabViews(effect.code);
            this.notifyChatBehavior({ kind:'trade_filled', stockId:'KRX:' + effect.code, side:effect.side });
          });
          this.notifyChatContext();
        });
      })
      .finally(() => { this.scheduledOrdersBusy = false; });
  }

  componentDidMount(){
    this.loadDbUser();
    this.loadBehaviorProfile();
    this.loadSeasonCards();
    this.loadFamilyProfiles();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('kw_proto_v1') || 'null'); } catch(e){}
    const order = [0,1,2,3,4,5];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    let restored = null;
    if (saved && saved.acc) {
      const migratedAcc = {};
      Object.keys(saved.acc).forEach(key => { migratedAcc[key] = migrateLegacyAccount(saved.acc[key], saved.sellRecords || []); });
      restored = { acc:migratedAcc, records:saved.records || [], sellRecords:saved.sellRecords || [], events:saved.events || [], seq:saved.seq, watchlist:saved.watchlist || [] };
    }
    this.setState(s => Object.assign({}, s, restored || {}, { reasonOrder: order }), () => { this.notifyChatContext(); this.processScheduledOrders(); });
    this.liveRefreshTimer = null;
    this.liveRefreshBusy = false;
    this.liveRefreshTick = () => {
      if (this.liveRefreshBusy) return;
      this.liveRefreshBusy = true;
      const symbol = this.state.code || '';
      fetch('/api/universe/data?symbol=' + encodeURIComponent(symbol) + '&chart=' + (symbol ? '1' : '0'), { cache:'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const u = this.uni();
          if (!data || !u.stocks) return;
          let changed = false;
          u.stocks.forEach(x => {
            const q = data.quotes && data.quotes[x.code];
            if (q && (x.price !== q.price || x.change !== q.rate)) {
              x.price = q.price; x.change = q.rate; changed = true;
            }
            const sp = data.sparks && data.sparks[x.code];
            if (sp) { x.spark = sp; changed = true; }
          });
          if (changed) this.forceUpdate();
        })
        .catch(() => {})
        .finally(() => { this.liveRefreshBusy = false; this.processScheduledOrders(); });
    };
    this.liveRefreshTick();
    this.liveRefreshTimer = setInterval(this.liveRefreshTick, 5000);

    // 가족 기록과 챗봇 버튼이 요청한 실제 화면으로 옮긴다.
    this.receiveNavigation = (event) => { if (event.origin === window.location.origin) this.openRequestedScreen(event.data); };
    window.addEventListener('message', this.receiveNavigation);

    // 차트 iframe 은 종목이 바뀔 때만 다시 연다. 기간·차트종류는 메시지로 넘겨
    // 문서를 다시 열지 않고 바꾼다.
    this.chartFrame = null;
    // 값을 인자로 받는다. setState 직후에는 this.state 가 아직 이전 값이다.
    this.postChartOptions = (overrides) => {
      // DOM 에서 직접 찾는 것이 우선이다. 핸드셰이크를 한 번 놓쳐도 탭 전환은 살아 있어야 한다.
      const frame = document.querySelector('iframe[data-chart-frame]');
      const target = (frame && frame.contentWindow) || this.chartFrame;
      if (!target) return;
      const next = overrides || {};
      target.postMessage(
        {
          type: 'kiwoom:chart-options',
          period: next.period || this.state.tf,
          chartType: next.chartType || this.state.chartType,
        },
        window.location.origin,
      );
    };
    this.receiveChartReady = (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'kiwoom:chart-ready') return;
      // 종목이 바뀌면 새 문서가 다시 알려온다. 그때 현재 선택을 되돌려 준다.
      this.chartFrame = event.source;
      this.postChartOptions();
    };
    window.addEventListener('message', this.receiveChartReady);

  }
