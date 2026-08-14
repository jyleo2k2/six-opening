  logEvent(name, screen){
    this.subOpenedAt = Date.now();
    const ev = { event: name, symbol: this.state.code, user_id: this.state.account === 'child' ? 'child_minji' : 'parent_mom', ts: new Date().toISOString() };
    this.setState(s => {
      const evs = (s.events || []).concat([ev]);
      this.subEventIdx = evs.length - 1;
      const n = Object.assign({}, s, { events: evs, screen: screen });
      this.persist(n); return n;
    });
  }
