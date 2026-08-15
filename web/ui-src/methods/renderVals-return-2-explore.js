
      // 맨 앞은 섹터가 아니라 '오늘 많이 오른 순' 보기다
      sectorChips: [{ id: 'rank', name: '오늘 많이 오른 순', emoji: '' }, { id: 'watch', name: '관심 기업', emoji: '' }].concat(u.sectors).map(x => ({
        name: x.name, emoji: x.emoji,
        style: 'display:flex;align-items:center;gap:6px;flex:none;padding:11px 16px;border-radius:999px;font-size:13.5px;font-weight:' + (x.id === s.sectorId ? '700' : '500') + ';white-space:nowrap;cursor:pointer;' + (x.id === s.sectorId
          ? 'color:#fff;background:#F5327F,0 0 16px -4px rgba(245,50,127,0.55),inset 0 1.5px 1px rgba(255,255,255,0.4)'
          : 'color:#5C6280;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)'),
        pick: () => this.set({ sectorId: x.id, cardIndex: 0 })
      })),
      // 등락률 순 보기에서는 칩이 이미 무슨 목록인지 말해주므로 제목을 비운다
      sectorTitle: q ? ('\"' + s.stockQuery.trim() + '\" 검색 결과 ' + baseList.length + '곳')
        : isRank ? ''
        : isWatch ? ('관심 기업 ' + baseList.length + '곳')
        : (this.sectorOf(s.sectorId).name + ' 회사 ' + u.stocks.filter(x => x.sector === s.sectorId).length + '곳'),

      // 종목 검색
      stockQuery: s.stockQuery, hasStockQuery: !!q,
      onStockQuery: e => { const v = e.target.value; this.setState({ stockQuery: v, cardIndex: 0 }); },
      clearStockQuery: () => this.setState({ stockQuery: '', cardIndex: 0 }),
      noCards: baseList.length === 0,
      noCardsTitle: q ? '찾는 회사가 없어' : '아직 관심 기업이 없어',
      noCardsHint: q ? '이름 일부만 넣어도 찾아줄게. 예를 들면 \"삼성\"'
        : '회사를 눌러서 들어간 다음, 오른쪽 위 하트를 누르면 여기에 모여.',
      cards: list,
      // 종목이 많으면 도트가 화면을 넘친다. 현재 위치 주변만 창처럼 보여주고 양끝은 작게 흘린다.
      cardDots: (() => {
        const total = list.length, MAX = 9;
        const start = total <= MAX ? 0 : Math.min(Math.max(0, s.cardIndex - Math.floor(MAX / 2)), total - MAX);
        const shown = Math.min(MAX, total);
        return Array.from({ length: shown }, (_, k) => {
          const i = start + k;
          const on = i === s.cardIndex;
          const fadeL = total > MAX && k === 0 && start > 0;
          const fadeR = total > MAX && k === shown - 1 && start + shown < total;
          const w = on ? 18 : (fadeL || fadeR) ? 4 : 6;
          return { style: 'width:' + w + 'px;height:' + (on ? 6 : w === 4 ? 4 : 6) + 'px;border-radius:999px;transition:width .18s ease;background:' + (on ? '#FF3D8D' : (fadeL || fadeR) ? '#E3DFEE' : '#D6D0E5') + (on ? ';box-shadow:0 0 9px rgba(255,61,141,0.42)' : '') };
        });
      })(),
      cardCountText: list.length > 9 ? (Math.min(s.cardIndex + 1, list.length)) + ' / ' + list.length : '',

      // 페이지 전체가 하나의 밝은 배경 — 카드 영역에서 어두워지는 경계를 만들지 않는다
      exploreBgStyle: 'position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column;overflow:hidden;background:radial-gradient(circle at 18% 7%,rgba(225,219,255,0.34) 0%,rgba(225,219,255,0) 32%),radial-gradient(circle at 88% 92%,rgba(255,226,239,0.25) 0%,rgba(255,226,239,0) 30%),linear-gradient(180deg,#FAF9FD 0%,#F5F3FB 52%,#FAF8FC 100%)',
      // 캐러셀 영역은 투명 — 별도 배경을 두지 않는다
      stageStyle: 'position:relative;flex:1;min-height:0;display:flex;flex-direction:column;background:transparent',
      cardsRef: (el) => { this.cardsEl = el; },
      cardsScroll: (e) => {
        const el = e.currentTarget;
        const first = el.firstElementChild;
        const second = first && first.nextElementSibling;
        // 카드 간격은 슬라이드 폭 + gap 이다. 상수로 두면 gap 을 바꿀 때 어긋나므로
        // 앞 두 슬라이드의 실제 거리를 잰다.
        const step = first
          ? (second
            ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
            : first.getBoundingClientRect().width)
          : 280;
        const i = Math.max(0, Math.min(list.length - 1, Math.round(el.scrollLeft / step)));
        if (i !== this.state.cardIndex) this.setState({ cardIndex: i });
      },
      cardsDown: (e) => {
        const el = e.currentTarget;
        const startX = e.clientX, startLeft = el.scrollLeft;
        let lastX = e.clientX, lastT = (typeof performance !== 'undefined' ? performance.now() : Date.now()), v = 0;
        this.dragged = false;
        el.style.scrollSnapType = 'none';
        el.style.cursor = 'grabbing';
        const mv = ev => {
          const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
          const dt = Math.max(1, now - lastT);
          v = (ev.clientX - lastX) / dt;
          lastX = ev.clientX; lastT = now;
          if (Math.abs(ev.clientX - startX) > 6) this.dragged = true;
          el.scrollLeft = startLeft - (ev.clientX - startX);
          // 실제로 끈 뒤에만 기본 동작을 막는다. 제자리 클릭에서 막으면 카드 click 이 사라진다.
          if (this.dragged) ev.preventDefault();
        };
        const up = () => {
          window.removeEventListener('pointermove', mv);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          el.style.cursor = 'grab';
          // 관성 상한. 감쇠가 0.93 이라 관성 이동거리는 vel/(1-0.93) = vel/0.07 이다.
          // 카드 간격 343px 기준 48 이면 관성 2장이고, 마지막에 스냅이 카드 경계로 당기며
          // 최대 0.5장이 더 붙어 손을 뗀 뒤 최대 2.5장에서 멈춘다. 더 줄이려면 이 값을 낮춘다.
          let vel = -v * 16;
          if (vel > 48) vel = 48; if (vel < -48) vel = -48;
          const restore = () => { el.style.scrollSnapType = 'x mandatory'; };
          const timer = setInterval(() => {
            if (Math.abs(vel) < 0.6) { clearInterval(timer); restore(); return; }
            el.scrollLeft += vel;
            vel *= 0.93;
          }, 16);
          setTimeout(() => { clearInterval(timer); restore(); }, 1200);
          setTimeout(() => { this.dragged = false; }, 0);
        };
        // setPointerCapture 를 쓰면 click 이 카드가 아니라 캡처한 컨테이너로 재타깃돼
        // 카드 진입이 죽는다. 대신 window 리스너로 컨테이너 밖 이동까지 받는다.
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      },

      stockName: st ? st.name : '', stockEmoji: st && !logos[st.code] ? (sec.name || '').charAt(0) : '',
      stockPriceText: st ? st.price.toLocaleString('ko-KR') + '원' : '',
      stockChangeText: st ? ((st.change >= 0 ? '▲ ' : '▼ ') + Math.abs(st.change).toFixed(2) + '%') : '',
      detailChangeStyleSm: 'font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (st && st.change >= 0 ? up : down),
      detailBadgeStyle: bigBadge(52, 18, 25) + (st && logos[st.code]
        ? ';background-color:#F4F4FA;background-image:url(' + logos[st.code] + ');background-position:center;background-size:contain;background-repeat:no-repeat'
        : ''),
      miniBadgeStyle: bigBadge(38, 13, 18),
