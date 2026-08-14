  postJson(path, body){
    return fetch(path, {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body)
    }).catch(() => {});
  }

  // 종목별 기업정보(detail)·차트·뉴스 체류를 잰다. 한 카테고리에서 나갈 때
  // 10초 이상 머물렀으면 그 종목의 방문 기록에 쌓아 두고, 실제 매수가
  // 체결될 때(flushTabViews) 한 번에 서버로 보낸다. 방문마다 상한 없이 쌓인다.
