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

