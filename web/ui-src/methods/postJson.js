  postJson(path, body){
    return fetch(path, {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body)
    }).catch(() => {});
  }

  // 종목 카드 목록 진입 → 매수 화면 도달 구간을 잰다.
  // 카드 목록을 떠나도 상세·차트·뉴스는 같은 구간이므로 창을 유지하고,
  // 매수까지 가지 않고 빠져나가면 그 구간은 버린다.
