  loadDbUser(){
    this.dbUser = null;
    fetch('/api/account', { cache:'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.user_id) this.dbUser = d; })
      .catch(() => {});
  }

  // F9-archive SPEC §3.2 대체 입력 — 로그인 사용자의 Supabase 행동 데이터로 낸 캐릭터.
  // 표본이 없거나 비로그인이면 null 로 남고, buildArchive() 가 기존 로컬 계산으로 폴백한다.
