  saveTrade(side, code, price, quantity, reason){
    if (!this.dbSyncable()) return;
    if (!code || !(price > 0) || !(quantity > 0)) return;
    this.postJson('/api/trade', {
      side: side, stock_code: code, price: price, quantity: quantity,
      reason: reason || null
    });
  }

