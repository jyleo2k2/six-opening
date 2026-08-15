
      backBtnStyle: 'width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)',
      stepPillStyle: 'min-width:58px;text-align:center;border-radius:999px;padding:8px 12px;font-size:14.5px;font-weight:700;font-variant-numeric:tabular-nums;color:#A9AEC4;background:#F1F2F8',

      navBarStyle: 'flex:none;display:flex;align-items:center;gap:8px;padding:6px 14px 10px',
      navPillStyle: 'flex:1;display:flex;align-items:center;border-radius:999px;padding:9px 6px;background:rgba(255,255,255,0.6);backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);box-shadow:0 14px 28px -12px rgba(35,25,80,0.35),inset 0 0 0 1px rgba(255,255,255,0.5)',
      navHomeIcon: this.navIcon(s.screen === 'home'), navHomeLabel: this.navLabel(s.screen === 'home'),
      navTradeIcon: this.navIcon(s.screen === 'explore' || s.screen === 'detail' || s.screen === 'buy'), navTradeLabel: this.navLabel(s.screen === 'explore' || s.screen === 'detail' || s.screen === 'buy'),
      navArchiveIcon: this.navIcon(s.screen === 'archive'), navArchiveLabel: this.navLabel(s.screen === 'archive'),
      navRankingIcon: this.navIcon(s.screen === 'ranking'), navRankingLabel: this.navLabel(s.screen === 'ranking'),
      navAccount: this.navItem(s.screen === 'portfolio'),

      tradeLocked: locked, tradeOpen: !locked,
      isParentAcct: s.account === 'parent',
      schoolLockOn: !!s.schoolLock,
      lockToggleStyle: s.schoolLock
        ? 'width:52px;height:30px;border-radius:999px;flex:none;cursor:pointer;position:relative;background:#F5327F'
        : 'width:52px;height:30px;border-radius:999px;flex:none;cursor:pointer;position:relative;background:#DDDFEC;box-shadow:inset 0 2px 4px rgba(70,60,120,0.18)',
      lockKnobStyle: 'position:absolute;top:3px;left:' + (s.schoolLock ? '25px' : '3px') + ';width:24px;height:24px;border-radius:999px;background:#fff;box-shadow:0 3px 6px rgba(35,25,80,0.28);transition:left .16s ease',
      toggleLock: () => this.set({ schoolLock: !s.schoolLock }),
      schoolStateText: this.isSchoolTime() ? '지금은 학교 시간' : '지금은 매매할 수 있는 시간',
      forceAuto: () => this.set({ forceSchool:'auto' }),
      forceOn: () => this.set({ forceSchool:'on' }),
      forceOff: () => this.set({ forceSchool:'off' }),
      forceAutoStyle: devChip(s.forceSchool === 'auto'), forceOnStyle: devChip(s.forceSchool === 'on'), forceOffStyle: devChip(s.forceSchool === 'off'),
      moreBtnStyle: 'font-size:13px;font-weight:700;color:#01185A;padding:9px 14px;border-radius:999px;cursor:pointer;white-space:nowrap;background:#F1F2F8',
      newsMoreLabel: newsItem ? '뉴스 자세히 보기' : (newsStatus === 'error' ? '다시 불러오기' : (newsStatus === 'empty' ? '새 소식 없음' : '불러오는 중')),
      newsMoreBtnStyle: 'font-size:13px;font-weight:700;color:#01185A;padding:9px 14px;border-radius:999px;white-space:nowrap;background:radial-gradient(ellipse 64% 56% at 50% -6%,rgba(255,255,255,1) 0%,rgba(255,255,255,0.5) 44%,rgba(255,255,255,0) 86%),linear-gradient(180deg,#FCFCFE 0%,#F4F5FB 36%,#EBEDF7 70%,#E2E5F1 100%);box-shadow:0 7px 12px -5px rgba(35,25,80,0.2),inset 0 -8px 13px -7px rgba(255,255,255,0.9),inset 0 1.5px 2px rgba(255,255,255,1);cursor:' + (newsItem || newsStatus === 'error' ? 'pointer' : 'default') + ';opacity:' + (newsItem || newsStatus === 'error' ? '1' : '0.58'),
      ctaStyle: locked ? CTA_OFF : CTA_ON,
      openChart: () => { this.logEvent('chart_detail_opened', 'chart'); },
      openNews: () => { if (newsItem) this.openNewsItem(newsItem); else if (st && newsStatus === 'error') this.loadNews(st.code); },
      closeSub: () => this.closeSub(),
      chartLine: () => this.setChartType('line'), chartCandle: () => this.setChartType('candlestick'),
      chartLineStyle: this.chip(s.chartType === 'line'), chartCandleStyle: this.chip(s.chartType === 'candlestick'),
      tfMinute: () => this.setTf('minute'), tfDaily: () => this.setTf('daily'), tfWeekly: () => this.setTf('weekly'),
      tfMinuteStyle: this.chip(s.tf === 'minute'), tfDailyStyle: this.chip(s.tf === 'daily'), tfWeeklyStyle: this.chip(s.tf === 'weekly'),
      // 종목만 주소에 남긴다. 기간·차트종류가 주소에 있으면 탭을 누를 때마다 iframe 문서가
      // 통째로 다시 열려 차트 번들과 데이터를 다시 받는다. 두 값은 postChartOptions 로 넘긴다.
      tradingViewChartUrl: st ? '/tradingview-chart?symbol=' + encodeURIComponent(st.code) : '',
      sectorNameText: st ? this.sectorOf(st.sector).name : '',
      newsKicker: detailNews ? (st ? st.name + ' 이야기' : '기업 이야기') : '',
      newsHeadline: detailNews ? detailNews.headline : '',
      newsLines: detailNews ? detailNews.summaryLines.map((t, i) => ({
        text: t, n: i + 1,
        numStyle: 'width:22px;height:22px;flex:none;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;background:#F5327F;box-shadow:0 4px 8px -2px rgba(214,54,124,0.4)'
      })) : [],
      newsSourceText: detailNews ? detailNews.publisher + ' · ' + this.formatNewsDate(detailNews.sourcePublishedAt) : '',
      openNewsSource: () => { if (detailNews && this.validNewsItem(detailNews, st ? st.code : '')) window.location.assign(detailNews.sourceUrl); },

      goHome: () => this.set({ screen:'home' }),
      goExplore: () => this.set({ screen:'explore' }),
      goPortfolio: () => this.set({ screen:'portfolio' }),
      goArchive: () => { this.set({ screen:'archive' }); this.loadDailyCloses(); },
      startBuy: () => { if (locked) return; this.set({ screen:'buy', buyStep:1, draft:this.blankDraft(), showPad:false }); },
      resetAll: () => {
        const fresh = seedAccounts();
        this.set({ acc: fresh, records: [], events: [], sellRecords: [], seq: 1, screen:'home', draft: this.blankDraft() , watchlist: [] });
      }
    };
  }
}
