  notifyChatContext(){
    if (window.parent === window) return;
    const screen = this.state.screen;
    const chatScreen = screen === 'archive'
      ? 'archive'
      : ['detail', 'chart', 'news'].indexOf(screen) >= 0
        ? 'stock'
        : ['buy', 'sell'].indexOf(screen) >= 0
          ? 'order'
          : 'home';
    const stock = this.stock();
    const context = { screen: chatScreen };
    if (stock && (chatScreen === 'stock' || chatScreen === 'order')) {
      context.stockId = 'KRX:' + stock.code;
      context.stockName = stock.name;
    }
    if (stock && chatScreen === 'order') {
      const isSellOrder = screen === 'sell' || (false);
      const unitPrice = isSellOrder
        ? stock.price
        : (this.state.draft.orderType === 'limit'
          ? Math.round(stock.price * (1 + this.state.draft.limitPct / 100))
          : stock.price);
      const quantity = isSellOrder ? this.state.sellDraft.qty : this.state.draft.amount / unitPrice;
      if (Number.isFinite(quantity) && quantity > 0) context.quantity = quantity;
      if (Number.isFinite(unitPrice) && unitPrice > 0) context.unitPrice = unitPrice;
    }
    window.parent.postMessage({ type:'kiwoom:chat-context', context:context }, window.location.origin);
  }
