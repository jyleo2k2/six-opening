  persist(next){
    // 두 덩어리로 나눠 저장한다.
    //  - 오래 남는 것(acc·records·…): 새로고침해도 유지한다. 지금까지와 같다.
    //  - 화면 임시값(ui): 화면이 실제 라우트로 나뉘면서 문서를 갈아끼울 때만 되살린다.
    //    새로고침·새 탭에서는 버려 "F5 하면 처음부터" 라는 지금 동작을 지킨다 (F2 SPEC §6.2).
    try {
      localStorage.setItem('kw_proto_v1', JSON.stringify({
        acc: next.acc, records: next.records, sellRecords: next.sellRecords || [],
        events: next.events || [], seq: next.seq, watchlist: next.watchlist || []
      }));
    } catch(e){}
    try {
      sessionStorage.setItem('kw_proto_ui_v1', JSON.stringify({
        screen: next.screen, account: next.account, code: next.code,
        draft: next.draft, sellDraft: next.sellDraft,
        buyStep: next.buyStep, sellStep: next.sellStep, arcTab: next.arcTab
      }));
    } catch(e){}
  }

  // 화면이 다른 주소로 넘어갈 때 쓴다. 문서가 갈아끼워지므로 메모리 상태가 사라지는데,
  // 이 표시가 있어야 다음 문서가 화면 임시값을 되살린다. 표시가 없으면(F5·새 탭·직접 진입)
  // 임시값은 버려진다.
  leaveToRoute(path){
    try { sessionStorage.setItem('kw_proto_nav_v1', '1'); } catch(e){}
    const top = window.top || window;
    top.location.href = path;
  }
