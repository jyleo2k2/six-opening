  // F9-archive — Supabase transactions 기반 지난 주차 카드. 로그인 아니거나 표본이
  // 없으면 null 로 남고, buildArchive() 는 로컬 records 주차만으로 카드 모아보기를 그린다.
  loadSeasonCards(){
    this.dbSeasonCards = null;
    fetch('/api/profile/season-cards', { cache:'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && Array.isArray(d.weeks) && d.weeks.length) { this.dbSeasonCards = d; this.forceUpdate(); } })
      .catch(() => {});
  }
