  componentDidUpdate(prevProps, prevState){
    if (prevState && prevState.sectorId !== this.state.sectorId && this.cardsEl) this.cardsEl.scrollLeft = 0;
    if (prevState && prevState.sellStep !== 2 && this.state.sellStep === 2) this.retroAt = Date.now();
    const orderContextChanged = prevState && ['buy', 'sell'].indexOf(this.state.screen) >= 0 && (
      prevState.draft.amount !== this.state.draft.amount ||
      prevState.draft.orderType !== this.state.draft.orderType ||
      prevState.draft.limitPct !== this.state.draft.limitPct ||
      prevState.sellDraft.qty !== this.state.sellDraft.qty
    );
    if (!prevState || prevState.screen !== this.state.screen || prevState.code !== this.state.code || orderContextChanged) {
      this.notifyChatContext();
    }
    if ((!prevState || prevState.screen !== this.state.screen || prevState.code !== this.state.code) && this.liveRefreshTick) {
      this.liveRefreshTick();
    }
    if (this.state.screen === 'detail' && this.state.code && (!prevState || prevState.screen !== 'detail' || prevState.code !== this.state.code)) {
      this.loadNews(this.state.code);
    }
    if (this.state.screen === 'archive' && (!prevState || prevState.screen !== 'archive')) {
      this.loadArchiveFeedReactions();
    }
    if (prevState && (prevState.screen !== this.state.screen || prevState.code !== this.state.code)) {
      this.trackTabView(prevState.screen, prevState.code, this.state.screen, this.state.code);
    }
  }

  // --- Supabase 연동 -------------------------------------------------
  // 화면은 지금처럼 localStorage 로 즉시 반응하고, 서버 저장은 뒤따라 보낸다.

