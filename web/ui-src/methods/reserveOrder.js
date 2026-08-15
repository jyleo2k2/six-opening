  reserveOrder(payload){
    // 지정가 대기와 장외 예약을 서버 주문 잔고에 접수한다. reserve_order 가 현금 또는
    // 수량을 한 트랜잭션에서 잠근다.
    //
    // **접수가 곧 주문이다.** 화면은 예약 목록을 따로 만들지 않으므로, 여기서 null 이
    // 돌아오면 주문은 없던 일이다 — 부르는 쪽이 완료 화면 대신 거절을 보여 준다.
    // 성공하면 loadDbUser() 가 계좌와 주문 목록을 다시 읽어 화면을 맞춘다.
    if (!this.dbSyncable()) return Promise.resolve(null);
    return fetch('/api/orders', {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload)
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.order_id) this.loadDbUser(); return d; })
      .catch(() => null);
  }

