  persist(next){
    try { localStorage.setItem('kw_proto_v1', JSON.stringify({ acc: next.acc, records: next.records, sellRecords: next.sellRecords || [], events: next.events || [], seq: next.seq, watchlist: next.watchlist || [] })); } catch(e){}
  }
