  // 저장된 값은 **첫 렌더 전에** 덮는다. componentDidMount 에서 되살리면 시드 지갑과
  // 홈 화면이 한 프레임 먼저 그려졌다가 바뀌는데, 화면이 실제 라우트로 나뉜 뒤로는
  // 화면을 옮길 때마다 문서가 새로 떠서 그 깜빡임이 이동할 때마다 보인다.
  state = Object.assign({
    screen: 'home', account: 'child',
    acc: seedAccounts(),
    sectorId: 'rank', code: null, buyStep: 1, showPad: false, cardIndex: 0,
    orderDone: null, sellDone: null, watchlist: [], stockQuery: '',
    draft: this.blankDraft(),
    records: [], events: [], sellRecords: [], seq: 1,
    closes: {},
    sellStep: 1, arcTab: 'report', sellPick: 'all',
    arcLikes: {}, arcCmts: {}, arcCmtOpen: {}, arcCmtDraft: {},
    sellDraft: { sellBy:'qty', qty:0, amountInput:0, orderType:'market', limitPct:0, reason:null, change:null, memo:'', memoSaved:false },
    schoolLock: true, forceSchool: 'auto',
    reasonOrder: [0,1,2,3,4,5]
  }, restorePrototypeState(migrateLegacyAccount));

