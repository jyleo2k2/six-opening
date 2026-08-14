  loadDbUser(){
    this.dbUser = null;
    fetch('/api/account', { cache:'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.user_id) this.dbUser = d; })
      .catch(() => {});
  }

