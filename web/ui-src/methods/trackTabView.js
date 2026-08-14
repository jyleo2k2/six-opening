  trackTabView(prevScreen, prevCode, screen, code){
    const CATS = ['detail', 'chart', 'news'];
    const open = this.tabOpen;
    if (open) {
      this.tabOpen = null;
      const closedAt = new Date();
      if (closedAt - open.at >= 10000) {
        const views = this.tabViews || (this.tabViews = {});
        (views[open.code] || (views[open.code] = [])).push({
          opened_at: open.at.toISOString(),
          closed_at: closedAt.toISOString()
        });
      }
    }
    if (CATS.indexOf(screen) >= 0 && code) {
      this.tabOpen = { code: code, at: new Date() };
    }
  }

  // 10초 판정은 여기서도 하지만 서버가 다시 확인한다. 초 자체는 서버에 저장하지 않는다.
