  closeSub(){
    const ms = this.subOpenedAt ? Date.now() - this.subOpenedAt : 0;
    const idx = this.subEventIdx;
    this.subOpenedAt = null; this.subEventIdx = null;
    this.setState(s => {
      const evs = (s.events || []).slice();
      if (idx !== null && idx !== undefined && evs[idx]) evs[idx] = Object.assign({}, evs[idx], { dwell_ms: ms });
      const n = Object.assign({}, s, { events: evs, screen: 'detail' });
      this.persist(n); return n;
    });
  }
