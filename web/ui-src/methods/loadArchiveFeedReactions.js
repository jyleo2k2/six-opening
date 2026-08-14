  loadArchiveFeedReactions(trades){
    const rows = Array.isArray(trades)
      ? trades
      : ((this.dbFamily && Array.isArray(this.dbFamily.trades)) ? this.dbFamily.trades : []);
    const ids = Array.from(new Set(rows.map(trade => trade && trade.id).filter(id => typeof id === 'string' && id)));
    if (!ids.length) {
      this.setState({ arcCmts:{}, arcLikes:{} });
      return Promise.resolve();
    }
    const query = encodeURIComponent(ids.join(','));
    return Promise.all([
      fetch('/api/comments?transaction_id=' + query, { cache:'no-store' }),
      fetch('/api/likes?transaction_id=' + query, { cache:'no-store' })
    ]).then(responses => Promise.all([
      responses[0].json().catch(() => ({})),
      responses[1].json().catch(() => ({}))
    ]).then(payloads => {
      const patch = {};
      if (responses[0].ok && Array.isArray(payloads[0].comments)) {
        const comments = {};
        payloads[0].comments.forEach(comment => {
          const id = comment.transactionId;
          if (!comments[id]) comments[id] = [];
          comments[id].push(comment);
        });
        patch.arcCmts = comments;
      }
      if (responses[1].ok && Array.isArray(payloads[1].likes)) {
        const likes = {};
        payloads[1].likes.forEach(like => { likes[like.transactionId] = like; });
        patch.arcLikes = likes;
      }
      this.setState(patch);
    })).catch(error => {
      console.warn('archive feed reactions load failed', error);
    });
  }
