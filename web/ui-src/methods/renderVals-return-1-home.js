
      homeAvatarImg: home.avatarImg,
      homeSeason: home.season,
      homeGreeting: home.greeting,
      homeDayCount: '시즌 3 · ' + home.day,
      homeItemLine: (home.brand ? home.brand + ' ' : '') + home.unit + ' ' + goalCount + '개 살 수 있어요',
      // 실제 계좌를 붙이면 손실도 나온다. 부호와 색을 함께 바꾼다.
      homeRateText: (homeRate >= 0 ? '+' : '−') + Math.abs(homeRate).toFixed(1) + '%',
      homeRateStyle: 'font-size:19px;font-weight:800;letter-spacing:-0.02em;margin-top:4px;color:'
        + (homeRate >= 0 ? '#D5327A' : '#2E6BE6'),
      goalImg: home.goalImg,
      goalItemImg: home.img,
      popGoal: () => {
        this.set({ goalPopupOpen: true });
        setTimeout(() => this.set({ goalPopupOpen: false }), 1500);
      },
      popItems: Array.from({ length: 6 }, (_, i) => {
        const on = Boolean(s.goalPopupOpen) && i < Math.min(goalCount, 6);
        const seed = (i + 1) * 47;
        const left = (15 + (seed * 7 % 70)).toFixed(1);
        const bottom = (12 + (seed * 13 % 55)).toFixed(1);
        const rot = (-35 + (seed * 5 % 70)).toFixed(1);
        return {
          style: 'position:absolute;left:' + left + '%;bottom:' + bottom + '%;width:44px;height:44px;object-fit:contain;pointer-events:none;'
            + (on
              ? 'opacity:0;transform:rotate(' + rot + 'deg);animation:popItem 1.3s ease-out forwards;animation-delay:' + (i * 0.1) + 's'
              : 'display:none')
        };
      }),

      holdingsTitle: '내 보유 종목',
      holdingsCount: '전체보기',
      homeNoHoldings: homeLoaded && homeRawHoldings.length === 0,
      holdingsPreview: homeHoldings.slice(0, 3).map(homeHoldingStyle),
      holdingsFull: homeHoldings.map(homeHoldingStyle),
      holdingsExpanded: Boolean(s.holdingsExpanded),
      toggleHoldings: () => this.set({ holdingsExpanded: !s.holdingsExpanded }),

      menuOpen: Boolean(s.menuOpen),
      toggleMenu: () => this.set({ menuOpen: !s.menuOpen }),
      notifyOpen: Boolean(s.notifyOpen),
      openNotifications: () => this.set({ menuOpen: false, notifyOpen: true }),
      dismissNotify: () => this.set({ notifyOpen: false }),
      // 세션 쿠키를 지우는 유일한 화면 경로다. 지우면 `/` 가 다시 로그인 화면을 띄운다.
      // iframe 안에서 돌기 때문에 top 을 옮겨야 프로토타입이 아니라 앱 전체가 다시 뜬다.
      logout: () => {
        fetch('/api/auth/login', { method: 'DELETE' }).finally(() => { window.top.location.href = '/'; });
      },

      meName: m.name, initial: m.name.charAt(0),
      totalAssetText: won(total), cashText: won(m.cash), navAccount: this.navItem(s.screen === 'portfolio'),
      holdCountText: m.holdings.length + '곳',
      pnlText: (pnl >= 0 ? '▲ +' : '▼ ') + Math.abs(Math.round(pnl)).toLocaleString('ko-KR') + '원',
      pnlStyle: 'font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (pnl >= 0 ? up : down),
