  totalAsset(){
    const m = this.me();
    const held = m.holdings.reduce((a,h) => {
      const st = this.uni().stocks.filter(s => s.code === h.code)[0];
      return a + (st ? st.price * h.qty : 0);
    }, 0);
    const reserved = (m.pending || []).reduce((a,p) => a + p.amount, 0);
    return m.cash + held + reserved;
  }
