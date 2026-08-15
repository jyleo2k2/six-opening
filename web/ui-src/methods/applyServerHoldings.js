  // 로그인한 사용자의 실제 Supabase 보유종목·잔액을 홈 화면 상태에 반영한다.
  // 로그인한 역할(child/parent)만 서버 값으로 덮어쓰고, 반대쪽 로컬 데모 데이터는 그대로 둔다
  // (dbSyncable() 과 같은 역할 매칭 규칙).
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
  // 표본이 없거나 비로그인이면 null 로 남고, buildArchive() 가 기존 로컬 계산으로 폴백한다.
