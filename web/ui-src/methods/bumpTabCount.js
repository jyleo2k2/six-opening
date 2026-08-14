  bumpTabCount(){ if (this.tabWin) this.tabWin.count += 1; }

  // 체결된 주문만 보낸다. 지정가 대기 주문은 체결 시점에 다시 부른다.
