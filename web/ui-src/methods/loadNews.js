  loadNews(code){
    if (!/^\d{6}$/.test(code || '')) return;
    const status = this.state.newsStatusByStock[code];
    if (status === 'loading' || status === 'ready' || status === 'empty') return;
    this.setState(s => {
      const statuses = Object.assign({}, s.newsStatusByStock, { [code]:'loading' });
      return Object.assign({}, s, { newsStatusByStock:statuses });
    });
    fetch('/api/news?stockId=' + encodeURIComponent('KRX:' + code), { cache:'no-store' })
      .then(r => { if (!r.ok) throw new Error('news lookup failed'); return r.json(); })
      .then(d => {
        const item = d && d.item ? d.item : null;
        if (item && !this.validNewsItem(item, code)) throw new Error('invalid news contract');
        this.setState(s => {
          const items = Object.assign({}, s.newsByStock, { [code]:item });
          const statuses = Object.assign({}, s.newsStatusByStock, { [code]:item ? 'ready' : 'empty' });
          return Object.assign({}, s, { newsByStock:items, newsStatusByStock:statuses });
        });
      })
      .catch(() => {
        this.setState(s => {
          const statuses = Object.assign({}, s.newsStatusByStock, { [code]:'error' });
          return Object.assign({}, s, { newsStatusByStock:statuses });
        });
      });
  }

