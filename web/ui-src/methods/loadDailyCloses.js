  loadDailyCloses(){
    if (this.closesBusy) return;
    const s = this.state;
    const codes = {};
    (s.records || []).forEach(r => { if (r.order_status === 'filled' && r.symbol) codes[r.symbol] = 1; });
    (s.sellRecords || []).forEach(r => { if (r.order_status === 'filled' && r.symbol) codes[r.symbol] = 1; });
    const symbols = Object.keys(codes).sort();
    if (!symbols.length) return;
    const key = symbols.join(',');
    if (this.closesKey === key) return;
    this.closesBusy = true;
    fetch('/api/quote/daily-closes?symbols=' + encodeURIComponent(key))
      .then(res => res.ok ? res.json() : Promise.reject(new Error('closes')))
      .then(data => {
        this.closesKey = key;
        this.setState(x => Object.assign({}, x, { closes: data.closes || {} }));
      })
      // 종가를 못 받으면 엔진이 전부 채점 보류로 처리한다. 화면은 그대로 뜬다.
      .catch(() => {})
      .finally(() => { this.closesBusy = false; });
  }
