  state = {
    screen: 'home', account: 'child',
    acc: seedAccounts(),
    sectorId: 'rank', code: null, buyStep: 1, showPad: false, cardIndex: 0,
    orderDone: null, sellDone: null, watchlist: [], stockQuery: '',
    draft: this.blankDraft(),
    records: [], events: [], sellRecords: [], badges: 0, seq: 1, tf: 'daily', chartType: 'line',
    closes: {},
    sellStep: 1, arcTab: 'report', sellPick: 'all',
    arcLikes: {}, arcCmts: {}, arcCmtOpen: {}, arcCmtDraft: {},
    sellDraft: { sellBy:'qty', qty:0, amountInput:0, orderType:'market', limitPct:0, reason:null, change:null, memo:'', memoSaved:false },
    schoolLock: true, forceSchool: 'auto', rankTab: 'week',
    reasonOrder: [0,1,2,3,4,5],
    newsByStock: {}, newsStatusByStock: {}, activeNewsId: null, activeNews: null
  };

