  // extra 는 질문식 기록의 부가 필드다 (F2 SPEC §7.1).
  // 매수는 plan_code·plan_target_price·memo, 매도는 plan_match·plan_changed_reason 을 담는다.
  // 반대쪽 필드가 섞여 와도 서버가 버리므로 여기서 side 별로 가르지 않는다.
  saveTrade(side, code, price, quantity, reason, extra){
    if (!this.dbSyncable()) return;
    if (!code || !(price > 0) || !(quantity > 0)) return;
    const x = extra || {};
    this.postJson('/api/trade', {
      side: side, stock_code: code, price: price, quantity: quantity,
      reason: reason || null,
      plan_code: x.plan_code || null,
      plan_target_price: x.plan_target_price || null,
      memo: x.memo || null,
      plan_match: typeof x.plan_match === 'boolean' ? x.plan_match : null,
      plan_changed_reason: x.plan_changed_reason || null
    });
  }

