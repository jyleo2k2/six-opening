
      backBtnStyle: 'width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)',
      stepPillStyle: 'min-width:58px;text-align:center;border-radius:999px;padding:8px 12px;font-size:14.5px;font-weight:700;font-variant-numeric:tabular-nums;color:#A9AEC4;background:#F1F2F8',

      // 상태바 아이콘 색. 위가 남색이던 랭킹 화면이 React 로 떠나 지금은 어두운 쪽만 쓴다.
      statusDark: 'position:absolute;left:0;top:0;z-index:3;pointer-events:none;display:block',
      statusLight: 'position:absolute;left:0;top:0;z-index:3;pointer-events:none;display:none',

      // 좌우 22 는 폰 프레임에 물리지 않는 여백이다. 프레임 개구부의 하단 코너는 반경 63px 으로
      // 화면 라운드(40px)보다 깊게 파여, 여백 14 면 알약 모서리가 개구부 경계에 2px 까지 붙는다.
      // `RankingScreen` 의 하단바도 같은 값을 쓴다 — 화면을 오갈 때 폭이 달라지면 안 된다.
      navBarStyle: 'flex:none;display:flex;align-items:center;gap:8px;padding:6px 22px 10px',
      navPillStyle: 'flex:1;display:flex;align-items:center;border-radius:999px;padding:9px 6px;background:rgba(255,255,255,0.6);backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);box-shadow:0 14px 28px -12px rgba(35,25,80,0.35),inset 0 0 0 1px rgba(255,255,255,0.5)',
      navHomeIcon: this.navIcon(s.screen === 'home'), navHomeLabel: this.navLabel(s.screen === 'home'),
      navTradeIcon: this.navIcon(s.screen === 'explore' || s.screen === 'buy'), navTradeLabel: this.navLabel(s.screen === 'explore' || s.screen === 'buy'),
      navArchiveIcon: this.navIcon(s.screen === 'archive'), navArchiveLabel: this.navLabel(s.screen === 'archive'),
      navRankingIcon: this.navIcon(s.screen === 'ranking'), navRankingLabel: this.navLabel(s.screen === 'ranking'),
      navAccount: this.navItem(s.screen === 'portfolio'),

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

      goHome: () => this.set({ screen:'home' }),
      goExplore: () => this.set({ screen:'explore' }),
      // 랭킹은 React 로 옮겨 갔다. 문서를 갈아끼우므로 화면 임시값을 넘길 표시를 남긴다.
      goRanking: () => this.leaveToRoute('/ranking'),
      // 계좌 화면은 React 로 옮겨 갔다. 문서는 그대로 두고 부모가 그 화면을 얹는다.
      goPortfolio: () => this.leaveToRoute('/portfolio'),
      goArchive: () => { this.set({ screen:'archive' }); this.loadDailyCloses(); },
      resetAll: () => {
        const fresh = seedAccounts();
        this.set({ acc: fresh, records: [], events: [], sellRecords: [], seq: 1, screen:'home', draft: this.blankDraft() , watchlist: [] });
      }
    };
  }
}
