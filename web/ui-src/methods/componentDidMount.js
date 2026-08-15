  componentDidMount(){
    this.loadDbUser();
    // 매수 이유 버튼 순서는 세션마다 섞는다 (F3 SPEC).
    const order = [0,1,2,3,4,5];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    this.setState({ reasonOrder: order }, () => { this.notifyChatContext(); this.processScheduledOrders(); });
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

  }
