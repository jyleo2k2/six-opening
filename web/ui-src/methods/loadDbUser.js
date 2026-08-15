  loadDbUser(){
    this.dbUser = null;
    this.readAccount().then(() => this.loadOpenOrders());
  }

  readAccount(){
    return fetch('/api/account', { cache:'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.user_id) { this.dbUser = d; this.applyServerHoldings(d); } })
      .catch(() => {});
  }

  // 로그인한 사용자의 실제 Supabase 보유종목·잔액을 홈 화면 상태에 반영한다.
  // 로그인한 역할(child/parent)만 서버 값으로 덮어쓰고, 반대쪽 로컬 데모 데이터는 그대로 둔다
  // (dbSyncable() 과 같은 역할 매칭 규칙).
