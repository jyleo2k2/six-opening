  openRequestedScreen(data){
    if (!data) return;
    if (data.type === 'kiwoom:open-stock' && /^\d{6}$/.test(String(data.symbol))) {
      const stock = (this.uni().stocks || []).filter(x => x.code === data.symbol)[0];
      if (stock) this.set({ code: stock.code, screen: 'detail' });
      return;
    }
    if (data.type !== 'kiwoom:open-chat-action' || !data.action || data.action.type !== 'open_screen') return;

    const action = data.action;
    const stockCode = /^KRX:\d{6}$/.test(String(action.stockId || '')) ? String(action.stockId).slice(4) : null;
    const stock = stockCode ? (this.uni().stocks || []).filter(x => x.code === stockCode)[0] : this.stock();
    if (action.target === 'home') {
      this.set({ screen:'home' });
    } else if (action.target === 'portfolio') {
      this.set({ screen:'portfolio' });
    } else if (action.target === 'archive') {
      const archiveTabs = ['report', 'return'];
      this.set({ screen:'archive', arcTab: archiveTabs.indexOf(action.archiveTab) >= 0 ? action.archiveTab : 'report' });
      this.loadDailyCloses();
    } else if (action.target === 'stock') {
      const sector = (this.uni().sectors || []).filter(x => x.id === action.sectorId)[0];
      if (sector) this.set({ screen:'explore', sectorId:sector.id, cardIndex:0 });
      else if (stock) this.set({ code:stock.code, screen:'detail' });
      else this.set({ screen:'explore' });
    } else if (action.target === 'order') {
      if (!stock) { this.set({ screen:'explore' }); return; }
      if (action.orderSide === 'sell') {
        const holding = this.me().holdings.filter(h => h.code === stock.code)[0];
        if (!holding) { this.set({ code:stock.code, screen:'detail' }); return; }
        const sameSell = this.state.screen === 'sell' && this.state.code === stock.code;
        const canOpenSellReason = sameSell && this.state.sellDraft.qty > 0;
        const canOpenSellConfirmation = canOpenSellReason && !!this.state.sellDraft.reason;
        const sellStep = action.orderStep === 'confirmation' && canOpenSellConfirmation ? 5 : (action.orderStep === 'reason' && canOpenSellReason ? 3 : 1);
        this.set({ code:stock.code, screen:'sell', sellStep:sellStep, sellReasonOrder:[0,1,2,3,4,5] });
      } else {
        const sameBuy = this.state.screen === 'buy' && this.state.code === stock.code;
        const canOpenBuyReason = sameBuy && this.state.draft.amount > 0;
        const hasBuyPlan = !!this.state.draft.plan && (this.state.draft.plan !== 'plan_target' || this.state.draft.targetPct !== null);
        const canOpenBuyConfirmation = canOpenBuyReason && !!this.state.draft.reason && hasBuyPlan;
        const buyStep = action.orderStep === 'confirmation' && canOpenBuyConfirmation ? 4 : (action.orderStep === 'reason' && canOpenBuyReason ? 2 : 1);
        this.set({ code:stock.code, screen:'buy', buyStep:buyStep, draft:sameBuy ? this.state.draft : this.blankDraft(), showPad:false });
      }
    }
  }

