    return {
      isHome: s.screen === 'home', isExplore: s.screen === 'explore', isDetail: s.screen === 'detail',
      isBuy: s.screen === 'buy',
      isChart: s.screen === 'chart', isNews: s.screen === 'news',
      isPortfolio: s.screen === 'portfolio', isArchive: s.screen === 'archive',
      isBuy1: s.buyStep === 1, isBuy2: s.buyStep === 2, isBuy3: s.buyStep === 3,
      buyInProgress: s.buyStep < 3,
