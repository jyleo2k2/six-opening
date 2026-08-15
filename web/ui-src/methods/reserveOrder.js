  reserveOrder(payload){
    // 지정가 대기와 장외 예약을 서버 주문 잔고에 접수한다. reserve_order 가 현금 또는
    // 수량을 한 트랜잭션에서 잠근다.
    //
    // **아직은 로컬 acc.pending 이 화면의 원본이다.** 그래서 실패해도 주문을 되돌리지
    // 않는다 — 지금 되돌리면 서버가 안 붙은 상태에서 예약 자체를 못 넣게 된다. 조회를
    // 서버로 옮기는 다음 단계에서 실패를 주문 거절로 바꾼다.
    if (!this.dbSyncable()) return Promise.resolve(null);
    return fetch('/api/orders', {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload)
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.order_id) this.loadDbUser(); return d; })
      .catch(() => null);
  }

