  blankDraft(){
    this.orderFlowSequence = (this.orderFlowSequence || 0) + 1;
    return { buyBy:'amount', amount:0, shares:0, amountSource:null, reason:null, plan:null, targetPct:null, memo:'', orderType:'market', limitPct:0, memoSaved:false, orderFlowId:'buy_' + this.orderFlowSequence };
  }

