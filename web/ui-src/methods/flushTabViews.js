  flushTabViews(code){
    const views = this.tabViews && this.tabViews[code];
    if (!views || !views.length) return;
    delete this.tabViews[code];
    if (!this.dbSyncable()) return;
    this.postJson('/api/tab-view', { stock_code: code, views: views });
  }

  // 체결된 주문만 보낸다. 지정가 대기 주문은 체결 시점에 다시 부른다.
  // extra 는 질문식 기록의 부가 필드다 (F2 SPEC §7.1).
  // 매수는 plan_code·plan_target_price·memo, 매도는 plan_match·plan_changed_reason 을 담는다.
  // 반대쪽 필드가 섞여 와도 서버가 버리므로 여기서 side 별로 가르지 않는다.
