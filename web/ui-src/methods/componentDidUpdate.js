  componentDidUpdate(prevProps){
    // support.js 호스트는 이 훅에 prevProps 하나만 넘긴다. 이전 상태는 직접 들고 비교한다.
    // setState 는 매번 새 state 객체를 만들므로 참조를 스냅샷해 두면 그대로 남는다.
    const prevState = this.prevState;
    this.prevState = this.state;
    if (prevState === this.state) return;
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
    if (this.state.screen === 'archive' && (!prevState || prevState.screen !== 'archive')) {
      this.loadArchiveFeedReactions();
    }
  }

  // --- Supabase 연동 -------------------------------------------------
  // 화면은 지금처럼 localStorage 로 즉시 반응하고, 서버 저장은 뒤따라 보낸다.

