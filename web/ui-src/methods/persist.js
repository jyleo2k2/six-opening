  persist(next){
    // 지갑만 저장한다. 화면 임시값은 저장하지 않는다 — 화면을 옮겨도 문서가 그대로라
    // 메모리 상태가 살아 있다. 예전에는 문서를 갈아끼워서 백업이 필요했다.
    try {
      localStorage.setItem('kw_proto_v1', JSON.stringify({
        acc: next.acc, records: next.records, sellRecords: next.sellRecords || [],
        events: next.events || [], seq: next.seq, watchlist: next.watchlist || []
      }));
    } catch(e){}
  }

  // 옮겨 간 화면으로 넘어갈 때 쓴다. **문서를 갈아끼우지 않는다** — 부모가 iframe 위에
  // 그 화면을 얹고 주소만 바꾼다. 문서를 새로 받으면 app.html 이 처음부터 다시 뜨는데,
  // 계정을 판정하기 전까지 아이 계정 데모가 먼저 그려져 남의 계좌가 잠깐 보인다.
  // 단독으로 연 app.html 에는 부모가 없으므로 그때만 주소를 직접 바꾼다.
  leaveToRoute(path){
    if (window.parent !== window) {
      window.parent.postMessage({ type:'kiwoom:open-route', path:path }, window.location.origin);
      return;
    }
    const top = window.top || window;
    top.location.href = path;
  }
