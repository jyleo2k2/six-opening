  // 로그인 사용자의 같은 family_tag 구성원·성향·체결을 서버에서 한 번에 읽는다.
  // buildArchive() 는 응답이 없을 때만 기존 로컬 데모 계산으로 폴백한다.
  loadFamilyProfiles(){
    this.dbFamily = null;
    fetch('/api/family', { cache:'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.viewer && Array.isArray(d.members)) {
          this.dbFamily = d;
          this.loadArchiveFeedReactions(d.trades);
          this.forceUpdate();
        }
      })
      .catch(() => {});
  }
