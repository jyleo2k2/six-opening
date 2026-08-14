  deleteArchiveComment(transactionId, commentId){
    fetch('/api/comments?id=' + encodeURIComponent(commentId), { method:'DELETE' })
      .then(response => response.json().catch(() => ({})).then(payload => {
        if (!response.ok) throw new Error(payload.error || '댓글을 지우지 못했습니다.');
        this.setState(state => {
          const comments = state.arcCmts || {};
          return { arcCmts:Object.assign({}, comments, {
            [transactionId]:(comments[transactionId] || []).filter(comment => String(comment.id) !== String(commentId))
          }) };
        });
      })).catch(error => window.alert(error.message || '댓글을 지우지 못했습니다.'));
  }
