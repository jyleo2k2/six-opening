  notifyChatContext(){
    if (window.parent === window) return;
    const screen = this.state.screen;
    // 상세·차트·뉴스는 React 로 옮겨 가 여기 화면 목록에 없다. 그 맥락은 옮긴 화면이 직접 올린다.
    const chatScreen = screen === 'archive'
      ? 'archive'
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
    // 내 지갑 값은 화면이 원본이다. 챗봇은 서버에서 돌아 localStorage 를 못 보고,
    // 주문의 서버 저장은 best-effort 라 DB 가 최신이 아닐 수 있다. 화면이 직접
    // 실어 보내야 "나 지금 수익률 몇퍼야?" 에 용어 정의 대신 값으로 답한다.
    // 서버는 이 숫자만 허용 목록에 넣으므로 화면과 다른 값은 말할 수 없다.
    const me = this.me();
    if (me) {
      const total = this.totalAsset();
      if (Number.isFinite(total)) {
        context.pnlPercent = Math.round((total - SEED) / SEED * 10000) / 100;
      }
      // 소수 수량 매매로 현금에 소수점이 생긴다. 서버 계약은 정수만 받는다.
      if (Number.isFinite(me.cash) && me.cash >= 0) context.cash = Math.round(me.cash);
      const holdings = (me.holdings || []).filter(h => Number(h.qty) > 0);
      context.holdingCount = holdings.length;
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
