  applyServerHoldings(d){
    const role = d.parent_child;
    if (role !== 'child' && role !== 'parent') return;
    const holdings = (d.holdings || [])
      .filter(h => h.stock_code)
      .map(h => ({ code: h.stock_code, qty: h.quantity, avg: h.avg_price }));
    this.setState(s => {
      const prev = s.acc[role] || {};
      return { acc: Object.assign({}, s.acc, {
        [role]: Object.assign({}, prev, { name: d.name || prev.name, cash: d.balance, holdings: holdings })
      }) };
    });
  }

  // F9-archive SPEC §3.2 대체 입력 — 로그인 사용자의 Supabase 행동 데이터로 낸 캐릭터.
  // 아카이브는 React 로 옮겨 갔다. 이 값은 챗봇 맥락에만 쓴다.
