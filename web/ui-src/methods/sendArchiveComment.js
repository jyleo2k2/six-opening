  sendArchiveComment(transactionId){
    const value = (((this.state.arcCmtDraft || {})[transactionId]) || '').trim();
    if (!value) return;
    this.archiveCommentBusy = this.archiveCommentBusy || {};
    if (this.archiveCommentBusy[transactionId]) return;
    this.archiveCommentBusy[transactionId] = true;
    fetch('/api/comments', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ transaction_id:transactionId, body:value })
    }).then(response => response.json().catch(() => ({})).then(payload => {
      if (!response.ok) throw new Error(payload.error || '댓글을 저장하지 못했습니다.');
      this.setState(state => {
        const comments = state.arcCmts || {}, drafts = state.arcCmtDraft || {};
        return {
          arcCmts:Object.assign({}, comments, { [transactionId]:(comments[transactionId] || []).concat([payload]) }),
          arcCmtDraft:Object.assign({}, drafts, { [transactionId]:'' })
        };
      });
    })).catch(error => window.alert(error.message || '댓글을 저장하지 못했습니다.'))
      .finally(() => { delete this.archiveCommentBusy[transactionId]; });
  }
