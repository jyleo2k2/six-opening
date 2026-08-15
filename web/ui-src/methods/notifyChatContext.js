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
    // 위 context.screen 은 챗봇용으로 뭉뚱그린 값이라(home·stock·order·archive) 주소로 쓰기엔 거칠다 —
    // 홈·탐색·랭킹·계좌가 전부 home 으로 모인다. 주소는 원래 화면 이름으로 적는다.
    window.parent.postMessage({
      type: 'kiwoom:screen',
      screen: this.state.screen,
      code: stock ? stock.code : null
    }, window.location.origin);
  }
