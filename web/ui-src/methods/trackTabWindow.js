  trackTabWindow(prevScreen, screen){
    if (screen === 'explore') {
      if (!this.tabWin) this.tabWin = { openedAt: new Date(), count: 0 };
      return;
    }
    if (!this.tabWin) return;
    if (screen === 'buy') {
      const win = this.tabWin;
      this.tabWin = null;
      const closedAt = new Date();
      if (closedAt - win.openedAt < 10000) return;
      if (!this.dbSyncable()) return;
      this.postJson('/api/tab-view', {
        opened_at: win.openedAt.toISOString(),
        closed_at: closedAt.toISOString(),
        tab_count: win.count
      });
      return;
    }
    if (['detail', 'chart', 'news'].indexOf(screen) < 0) this.tabWin = null;
  }

