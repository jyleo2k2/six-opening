  lastBuy(code){
    const rs = this.state.records.filter(r => r.symbol === code && r.user_id === (this.state.account === 'child' ? 'child_minji' : 'parent_mom'));
    return rs.length ? rs[rs.length - 1] : null;
  }
