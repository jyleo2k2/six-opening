
  // 미체결 주문(지정가 대기·장외 예약)의 원본은 서버다. 화면은 목록을 만들지 않고 받아만
  // 온다 — 브라우저를 지워도 예약이 살아 있어야 하고, 예약이 잡은 현금·수량도 서버가 잠근다.
  //
  // 이 조회는 만기가 지난 예약을 먼저 정산하므로 곧 예약 체결 트리거이기도 하다. 화면이
  // 시가를 확인하던 processScheduledOrders 를 여기로 옮긴 이유다 — 앱을 안 열면 영영
  // 체결되지 않는 예약은 예약이 아니다.
  loadOpenOrders(){
    const role = this.dbUser && this.dbUser.parent_child;
    if (role !== 'child' && role !== 'parent') return;
    fetch('/api/orders', { cache:'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || !Array.isArray(d.orders)) return;
        this.setState(s => {
          const prev = s.acc[role] || {};
          return { acc: Object.assign({}, s.acc, {
            [role]: Object.assign({}, prev, { pending: pendingFromServerOrders(d.orders) })
          }) };
        });
        // 정산이 있었으면 잠겼던 현금·수량이 보유로 바뀌었다. 계좌만 다시 읽는다.
        if (Array.isArray(d.settled) && d.settled.length) this.readAccount();
      })
      .catch(() => {});
  }
