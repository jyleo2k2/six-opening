  toggleArchiveLike(transactionId){
    this.archiveLikeBusy = this.archiveLikeBusy || {};
    if (this.archiveLikeBusy[transactionId]) return;
    this.archiveLikeBusy[transactionId] = true;
    fetch('/api/likes', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ transaction_id:transactionId })
    }).then(response => response.json().catch(() => ({})).then(payload => {
      if (!response.ok) throw new Error(payload.error || '좋아요를 저장하지 못했습니다.');
      this.setState(state => ({ arcLikes:Object.assign({}, state.arcLikes || {}, { [transactionId]:payload }) }));
    })).catch(error => window.alert(error.message || '좋아요를 저장하지 못했습니다.'))
      .finally(() => { delete this.archiveLikeBusy[transactionId]; });
  }
