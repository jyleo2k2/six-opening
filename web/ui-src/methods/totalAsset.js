  totalAsset(){
    const m = this.me();
    const held = m.holdings.reduce((a,h) => {
      const st = this.uni().stocks.filter(s => s.code === h.code)[0];
      return a + (st ? st.price * h.qty : 0);
    }, 0);
    // 매수 예약 현금은 cash에서 빠져 있으므로 총자산에 다시 더한다. 매도 예약 수량은 holdings에 남아 있다.
    const reserved = (m.pending || []).reduce((a,p) => a + ((p.side || 'buy') === 'buy' ? (Number(p.reservedAmount ?? p.amount) || 0) : 0), 0);
    return m.cash + held + reserved;
  }
