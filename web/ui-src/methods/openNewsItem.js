  openNewsItem(item){
    const code = this.state.code;
    if (!code || !this.validNewsItem(item, code)) return;
    this.bumpTabCount();
    this.setState(s => Object.assign({}, s, { activeNewsId:item.newsId, activeNews:item }));
    this.logEvent('news_detail_opened', 'news');
    fetch('/api/news/' + encodeURIComponent(String(item.newsId)), { cache:'no-store' })
      .then(r => { if (!r.ok) throw new Error('news detail lookup failed'); return r.json(); })
      .then(d => {
        const fresh = d && d.item;
        if (!this.validNewsItem(fresh, code) || fresh.newsId !== item.newsId || fresh.articleId !== item.articleId) throw new Error('news identity mismatch');
        this.setState(s => s.activeNewsId === item.newsId ? Object.assign({}, s, { activeNews:fresh }) : null);
      })
      .catch(() => {});
  }

