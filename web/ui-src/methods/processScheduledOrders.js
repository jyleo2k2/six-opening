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
            this.saveTrade(effect.side, effect.code, effect.price, effect.qty, effect.reason, effect.plan);
            if (effect.side === 'buy') this.flushTabViews(effect.code);
            this.notifyChatBehavior({ kind:'trade_filled', stockId:'KRX:' + effect.code, side:effect.side });
          });
          this.notifyChatContext();
        });
      })
      .finally(() => { this.scheduledOrdersBusy = false; });
  }

