  flushTabViews(code){
    const views = this.tabViews && this.tabViews[code];
    if (!views || !views.length) return;
    delete this.tabViews[code];
    if (!this.dbSyncable()) return;
    this.postJson('/api/tab-view', { stock_code: code, views: views });
  }

  // 체결된 주문만 보낸다. 지정가 대기 주문은 체결 시점에 다시 부른다.
