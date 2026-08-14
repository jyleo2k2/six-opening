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
