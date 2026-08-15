  openRequestedScreen(data){
    if (!data) return;
    if (data.type === 'kiwoom:open-stock' && /^\d{6}$/.test(String(data.symbol))) {
      const stock = (this.uni().stocks || []).filter(x => x.code === data.symbol)[0];
      // 종목 상세는 React 로 옮겨 갔다. 주소로 넘겨 부모가 그 화면을 얹는다.
      if (stock) this.leaveToRoute('/stock/' + stock.code);
      return;
    }
    // 옮겨 간 상세 화면이 되돌려 보내는 탭 유효 열람. 매수 체결 때 `flushTabViews` 가
    // 모아서 서버로 보내는 구조는 그대로다. 10초 판정은 보낸 쪽과 서버가 한다.
    if (data.type === 'kiwoom:tab-view' && /^\d{6}$/.test(String(data.code)) && data.opened_at && data.closed_at) {
      const views = this.tabViews || (this.tabViews = {});
      (views[data.code] || (views[data.code] = [])).push({
        opened_at: String(data.opened_at),
        closed_at: String(data.closed_at)
      });
      return;
    }
    // 옮겨 간 상세 화면의 차트·뉴스 열람. 지갑 상태의 기록자는 이 문서 하나여야 하므로
    // React 가 직접 저장하지 않고 여기로 보낸다 — 아카이브 열람 수가 이 메모리를 읽는다.
    if (data.type === 'kiwoom:view-event' && /^\d{6}$/.test(String(data.code))
      && (data.event === 'chart_detail_opened' || data.event === 'news_detail_opened')) {
      const ev = { event: data.event, symbol: String(data.code), user_id: this.state.account === 'child' ? 'child_minji' : 'parent_mom', ts: new Date().toISOString() };
      this.setState(s => {
        const n = Object.assign({}, s, { events: (s.events || []).concat([ev]) });
        this.persist(n); return n;
      });
      return;
    }
    // 옮겨 간 상세 화면의 관심(하트) 토글. 탐색의 관심 기업 필터가 이 메모리를 읽는다.
    if (data.type === 'kiwoom:watch-toggle' && /^\d{6}$/.test(String(data.code))) {
      const cur = this.state.watchlist || [];
      const next = data.on ? (cur.indexOf(data.code) >= 0 ? cur : cur.concat([String(data.code)])) : cur.filter(c => c !== data.code);
      if (next !== cur) this.set({ watchlist: next });
      return;
    }
    if (data.type !== 'kiwoom:open-chat-action' || !data.action || data.action.type !== 'open_screen') return;

    const action = data.action;
    const stockCode = /^KRX:\d{6}$/.test(String(action.stockId || '')) ? String(action.stockId).slice(4) : null;
    const stock = stockCode ? (this.uni().stocks || []).filter(x => x.code === stockCode)[0] : this.stock();
    if (action.target === 'home') {
      // 홈 화면은 여기 없다. 주소로 넘겨 React 화면이 그리게 한다.
      this.leaveToRoute('/');
    } else if (action.target === 'ranking') {
      // 랭킹 화면은 여기 없다. 주소로 넘겨 React 화면이 그리게 한다.
      this.leaveToRoute('/ranking');
    } else if (action.target === 'portfolio') {
      // 계좌 화면은 여기 없다. 주소로 넘겨 React 화면이 그리게 한다.
      this.leaveToRoute('/portfolio');
    } else if (action.target === 'archive') {
      // 아카이브 화면은 여기 없다. 탭·카드 모아보기까지 주소로 넘겨 React 화면이 그리게 한다.
      const view = action.archiveOverlay === 'cards' ? 'cards'
        : action.archiveTab === 'return' ? 'return' : '';
      this.leaveToRoute(view ? '/archive/' + view : '/archive');
    } else if (action.target === 'stock') {
      // 탐색 화면도 React 로 옮겨 갔다. 섹터 필터는 주소 구간(`/explore/{섹터}`)으로 넘긴다.
      const stockFilters = ['rank', 'watch'].concat((this.uni().sectors || []).map(x => x.id));
      const chatSectorToPrototypeSector = {
        game: 'game', logistics: 'logi', semiconductor: 'semi', defense: 'defense', food: 'food', energy: 'energy',
        entertainment: 'enter', retail: 'retail', finance: 'bank', automotive: 'auto', shipbuilding: 'ship', airline: 'air', cosmetics: 'beauty',
      };
      const sectorId = chatSectorToPrototypeSector[action.sectorId] || action.sectorId;
      if (action.stockView === 'explore' || stockFilters.indexOf(sectorId) >= 0) {
        this.leaveToRoute(stockFilters.indexOf(sectorId) >= 0 && sectorId !== 'rank' ? '/explore/' + sectorId : '/explore');
      } else if (stock) this.leaveToRoute('/stock/' + stock.code);
      else this.leaveToRoute('/explore');
    } else if (action.target === 'order') {
      if (!stock) { this.leaveToRoute('/explore'); return; }
      if (action.orderSide === 'sell') {
        const holding = this.me().holdings.filter(h => h.code === stock.code)[0];
        if (!holding) { this.leaveToRoute('/stock/' + stock.code); return; }
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

