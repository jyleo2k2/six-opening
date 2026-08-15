  applyServerHoldings(d){
    const role = d.parent_child;
    if (role !== 'child' && role !== 'parent') return;
    const holdings = (d.holdings || [])
      .filter(h => h.stock_code)
      .map(h => ({ code: h.stock_code, qty: h.quantity, avg: h.avg_price }));
    // 화면의 cash 는 주문에 쓸 수 있는 돈이다. balance 는 미체결 주문이 잠근 몫까지 포함한
    // 총 현금이라, 그대로 쓰면 잠긴 돈까지 주문하려 들고 reserve_order 가 그때 거절한다.
    const cash = typeof d.available === 'number' ? d.available : d.balance;
    this.setState(s => {
      const prev = s.acc[role] || {};
      return { acc: Object.assign({}, s.acc, {
        [role]: Object.assign({}, prev, { name: d.name || prev.name, cash: cash, holdings: holdings })
      }) };
    });
  }

  // F9-archive SPEC §3.2 대체 입력 — 로그인 사용자의 Supabase 행동 데이터로 낸 캐릭터.
  // 아카이브는 React 로 옮겨 갔다. 이 값은 챗봇 맥락에만 쓴다.
