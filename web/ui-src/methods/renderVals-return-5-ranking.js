
      isRanking: s.screen === 'ranking',
      // 랭킹 화면만 상단이 남색이라 상태바 아이콘을 흰색으로 바꾼다.
      statusDark: 'position:absolute;left:0;top:0;z-index:3;pointer-events:none;display:' + (s.screen === 'ranking' ? 'none' : 'block'),
      statusLight: 'position:absolute;left:0;top:0;z-index:3;pointer-events:none;display:' + (s.screen === 'ranking' ? 'block' : 'none'),
      goRanking: () => this.set({ screen:'ranking' }),
      rkHeadStyle: 'flex:none;position:relative;height:416px;border-radius:0 0 48px 48px;overflow:hidden;'
        + 'background:radial-gradient(125% 100% at 50% 8%,#2A5FC4 0%,#123B8E 38%,#0B2A6B 68%,#01185A 100%)',
      rkBackStyle: 'position:absolute;left:18px;top:65px;width:38px;height:38px;border-radius:999px;background:rgba(255,255,255,0.14);'
        + 'display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;line-height:1;padding-bottom:3px;'
        + 'box-sizing:border-box;cursor:pointer',
      rkTitleStyle: 'position:absolute;left:0;right:0;top:65px;height:38px;display:flex;align-items:center;justify-content:center;gap:7px;'
        + 'font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em',
      rkSegWrap: 'position:absolute;left:78px;top:117px;width:246px;height:40px;box-sizing:border-box;border-radius:20px;'
        + 'background:rgba(0,0,0,0.26);display:flex;padding:4px;gap:6px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3)',
      rkSegWeek: this.rkSeg(rankTab === 'week'),
      rkSegSeason: this.rkSeg(rankTab === 'season'),
      pickWeek: () => this.setState({ rankTab:'week' }),
      pickSeason: () => this.setState({ rankTab:'season' }),
      rkConeStyle: 'position:absolute;left:135px;top:150px;width:132px;height:192px;pointer-events:none;filter:blur(7px);'
        + 'clip-path:polygon(34% 0%,66% 0%,100% 100%,0% 100%);'
        + 'background:linear-gradient(180deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.07) 56%,rgba(255,255,255,0) 100%)',
      rkGroundStyle: 'position:absolute;left:26px;top:383px;width:350px;height:12px;border-radius:999px;filter:blur(2px);'
        + 'background:radial-gradient(closest-side,rgba(0,0,0,0.42) 0%,rgba(0,0,0,0) 78%)',
      podium: rkPodium(rankTab),
      rankRows: rkRows(rankTab, up, down),
