  componentDidMount(){
    this.loadDbUser();
    this.loadBehaviorProfile();
    this.loadSeasonCards();
    this.loadFamilyProfiles();
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
