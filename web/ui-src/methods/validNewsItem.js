  validNewsItem(item, stockCode){
    if (!item || !Number.isSafeInteger(item.newsId) || item.newsId <= 0 || !Number.isSafeInteger(item.articleId) || item.articleId <= 0) return false;
    if (item.scope !== 'company') return false;
    if (!Array.isArray(item.stockCodes) || item.stockCodes.some(code => !/^\d{6}$/.test(code))) return false;
    if (item.stockCodes.indexOf(stockCode) < 0) return false;
    if (typeof item.headline !== 'string' || !item.headline.trim() || typeof item.homeSummary !== 'string' || !item.homeSummary.trim()) return false;
    if (!Array.isArray(item.summaryLines) || item.summaryLines.length !== 3 || item.summaryLines.some(line => typeof line !== 'string' || !line.trim() || line.length > 36)) return false;
    if (typeof item.publisher !== 'string' || !item.publisher.trim() || typeof item.sourcePublishedAt !== 'string' || !Number.isFinite(Date.parse(item.sourcePublishedAt))) return false;
    try {
      const source = new URL(item.sourceUrl);
      return source.protocol === 'http:' || source.protocol === 'https:';
    } catch(e) {
      return false;
    }
  }

  // 정확 채점에 쓸 일봉 종가를 가져온다. 사고판 종목이 바뀔 때만 다시 부른다.
