  pickOrderType(orderType){
    const draft = this.state.draft;
    if (draft.orderType === orderType) return;
    const stock = this.stock();
    this.setDraft({ orderType:orderType });
    if (stock && draft.orderFlowId) {
      this.notifyChatBehavior({
        kind:'order_method_selected',
        stockId:'KRX:' + stock.code,
        orderFlowId:draft.orderFlowId,
        orderType:orderType
      });
    }
  }

  // 성향 스냅샷(F9)은 서버 엔진이 계산한다. 두 계정을 한 번에 받아 두면 계정 전환·가족 비교에 재요청이 없다.
  // 체결이 새로 나면 profiles 를 비워 다음 아카이브 진입에서 다시 계산한다.
