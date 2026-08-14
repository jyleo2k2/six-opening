  loadProfiles(){
    if (this.profileBusy || this.state.profileStatus === 'loading' || this.state.profileStatus === 'ready') return;
    this.profileBusy = true;
    this.setState(s => Object.assign({}, s, { profileStatus: 'loading' }));
    const snap = this.state;
    const ask = (account, narrate) => fetch('/api/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: account, narrate: narrate, state: { acc: snap.acc, records: snap.records, sellRecords: snap.sellRecords || [], events: snap.events || [] } })
    }).then(r => r.ok ? r.json() : null);
    // 1차는 서술 없이 즉시 받아 화면을 채우고(룰 기반 폴백 서술 포함), Luna 서술은 도착하는 대로 바꿔 끼운다.
    Promise.all([ask('child', false), ask('parent', false)])
      .then(pair => {
        if (!pair[0] || !pair[1]) throw new Error('profile unavailable');
        this.setState(s => Object.assign({}, s, { profiles: { child: pair[0], parent: pair[1] }, profileStatus: 'ready' }));
        return Promise.all([ask('child', true), ask('parent', true)]);
      })
      .then(pair => {
        if (!pair || !pair[0] || !pair[1]) return;
        this.setState(s => s.profileStatus === 'ready'
          ? Object.assign({}, s, { profiles: { child: pair[0], parent: pair[1] } })
          : s);
      })
      .catch(() => {
        this.setState(s => s.profileStatus === 'ready' ? s : Object.assign({}, s, { profileStatus: 'error' }));
      })
      .finally(() => { this.profileBusy = false; });
  }

