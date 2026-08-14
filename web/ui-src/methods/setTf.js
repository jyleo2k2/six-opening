  setTf(tf){
    const ev = { event: 'chart_timeframe_changed', symbol: this.state.code, timeframe: tf, ts: new Date().toISOString() };
    this.setState(s => {
      const n = Object.assign({}, s, { tf: tf, events: (s.events || []).concat([ev]) });
      this.persist(n); return n;
    });
    // 차트 iframe 에는 여기서 직접 알린다. 갱신 훅에 기대면 전환이 전달되지 않는다.
    if (this.postChartOptions) this.postChartOptions({ period: tf });
  }
