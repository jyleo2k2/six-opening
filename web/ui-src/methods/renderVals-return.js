    return {
      isHome: s.screen === 'home', isExplore: s.screen === 'explore', isDetail: s.screen === 'detail',
      isBuy: s.screen === 'buy',
      isChart: s.screen === 'chart', isNews: s.screen === 'news',
      isPortfolio: s.screen === 'portfolio', isArchive: s.screen === 'archive',
      isBuy1: s.buyStep === 1, isBuy2: s.buyStep === 2, isBuy3: s.buyStep === 3,
      buyInProgress: s.buyStep < 3,

      meName: m.name, initial: m.name.charAt(0),
      totalAssetText: won(total), cashText: won(m.cash), navAccount: this.navItem(s.screen === 'portfolio'),
      holdCountText: m.holdings.length + '곳',
      pnlText: (pnl >= 0 ? '▲ +' : '▼ ') + Math.abs(Math.round(pnl)).toLocaleString('ko-KR') + '원',
      pnlStyle: 'font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (pnl >= 0 ? up : down),

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

      // 관심 종목 — 누르기 전 회색, 담고 나면 분홍
      watchBtnStyle: 'width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)',
      watchFill: (st && (s.watchlist || []).indexOf(st.code) >= 0) ? '#F5327F' : 'none',
      watchStroke: (st && (s.watchlist || []).indexOf(st.code) >= 0) ? '#F5327F' : '#B8BDD0',
      toggleWatch: () => {
        if (!st) return;
        const cur = this.state.watchlist || [];
        const on = cur.indexOf(st.code) >= 0;
        this.set({ watchlist: on ? cur.filter(c => c !== st.code) : cur.concat([st.code]) });
      },
      stockPriceText: st ? st.price.toLocaleString('ko-KR') + '원' : '',
      stockChangeText: st ? ((st.change >= 0 ? '▲ ' : '▼ ') + Math.abs(st.change).toFixed(2) + '%') : '',
      detailChangeStyle: 'font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (st && st.change >= 0 ? up : down),
      detailChangeStyleSm: 'font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (st && st.change >= 0 ? up : down),
      stockLineColor: st && st.change >= 0 ? up : down,
      stockSparkBig: st ? this.polyline(st.spark, 336, 112) : '',
      stockDescLong: st ? (st.name + this.topic(st.name) + ' ' + st.desc + '.') : '',
      stockNews: newsItem ? newsItem.headline : (newsStatus === 'error' ? '뉴스를 불러오지 못했어. 다시 눌러 줘.' : (newsStatus === 'empty' ? '아직 검수를 통과한 새 소식이 없어.' : '검수를 통과한 새 소식을 찾고 있어.')),
      detailBadgeStyle: bigBadge(52, 18, 25) + (st && logos[st.code]
        ? ';background-color:#F4F4FA;background-image:url(' + logos[st.code] + ');background-position:center;background-size:contain;background-repeat:no-repeat'
        : ''),
      miniBadgeStyle: bigBadge(38, 13, 18),

      buyStepNo: s.buyStep,
      prog1: prog(1), prog2: prog(2), prog3: prog(3),
      buyBackGlyph: s.buyStep === 1 ? '✕' : (s.buyStep === 3 ? '✕' : '‹'),
      buyInputText: (byQty ? shares : amount).toLocaleString('ko-KR'),
      buyInputUnit: byQty ? '주' : '원',
      amountWon: won(amount), totalText: won(grand),
      qtyText: qty.toFixed(2) + '주',
      // 금액으로 넣으면 몇 주가 되는지, 주 수로 넣으면 얼마가 되는지 서로 보여준다
      qtyHint: byQty
        ? (shares > 0 && st ? (Math.round(shares * execPrice)).toLocaleString('ko-KR') + '원이 들어가' : '몇 주 살지 골라봐')
        : (amount > 0 && st ? (st.name + ' 약 ' + qty.toFixed(2) + '주' + (s.draft.orderType === 'limit' ? '를 살 수 있게 돼' : '를 살 수 있어')) : '얼마를 넣을지 골라봐'),
      // 지갑과 주문 가격으로 최대 몇 주까지 살 수 있는지
      buyMaxHint: (execPrice > 0 && m.cash > 0)
        ? ('최대 ' + Math.floor(m.cash / execPrice) + '주까지 살 수 있어 · 지갑 ' + won(m.cash))
        : '',
      byAmountStyle: this.chip(!byQty), byQtyStyle: this.chip(byQty),
      pickByAmount: () => { this.setDraft({ buyBy:'amount' }); this.setState({ showPad:false }); },
      pickByQty: () => { this.setDraft({ buyBy:'qty' }); this.setState({ showPad:false }); },
      // 빠른선택과 직접 입력은 구분한다 — 직접 넣은 값이 3만원이어도 3만원 칩이 켜지지 않는다
      // 금액 칩 — 빠른선택과 직접 입력을 구분한다 (f2-trade 계약)
      chip1: this.chip(s.draft.amountSource === 'preset' && amount === 10000),
      chip3: this.chip(s.draft.amountSource === 'preset' && amount === 30000),
      chip5: this.chip(s.draft.amountSource === 'preset' && amount === 50000),
      chipC: this.chip(s.draft.amountSource === 'custom'),
      amt1: () => { this.setDraft({ amount:10000, amountSource:'preset' }); this.setState({ showPad:false }); },
      amt3: () => { this.setDraft({ amount:30000, amountSource:'preset' }); this.setState({ showPad:false }); },
      amt5: () => { this.setDraft({ amount:50000, amountSource:'preset' }); this.setState({ showPad:false }); },
      amtCustom: () => {
        this.setDraft({ amount:Math.min(availableCash, amount), amountSource:'custom' });
        this.setState(x => ({ showPad: !x.showPad }));
      },
      // 주 수 칩 — 같은 규칙을 주 수에 적용한다
      maxShares: maxShares,
      qtyChips: [1, 5, 10].map(v => ({
        label: v + '주',
        style: this.chip(s.draft.amountSource === 'preset' && shares === v),
        pick: () => { this.setDraft({ shares: Math.min(maxShares, v), amountSource:'preset' }); this.setState({ showPad:false }); }
      })).concat([{
        label: '직접', style: this.chip(s.draft.amountSource === 'custom'),
        pick: () => {
          this.setDraft({ shares: Math.min(maxShares, shares), amountSource:'custom' });
          this.setState(x => ({ showPad: !x.showPad }));
        }
      }]),
      qtyPadKeys: qtyPadKeys,
      showPad: s.showPad, padKeys: padKeys,
      buyByAmount: !byQty, buyByQty: byQty,
      buyPadKeys: byQty ? qtyPadKeys : padKeys,
      mktStyle: this.chip(s.draft.orderType === 'market'), limStyle: this.chip(s.draft.orderType === 'limit'),
      pickMarket: () => this.pickOrderType('market'),
      pickLimit: () => this.pickOrderType('limit'),
      showLimit: s.draft.orderType === 'limit',
      limitPriceText: limPrice.toLocaleString('ko-KR'),
      limitDiffText: s.draft.limitPct === 0 ? '지금 가격 그대로야' : ('지금 ' + price.toLocaleString('ko-KR') + '원보다 ' + Math.abs(s.draft.limitPct) + '% 싸'),
      limChip10: this.chip(s.draft.limitPct === -10), limChip5: this.chip(s.draft.limitPct === -5),
      limChip3: this.chip(s.draft.limitPct === -3), limChip0: this.chip(s.draft.limitPct === 0),
      lim10: () => this.setDraft({ limitPct:-10 }), lim5: () => this.setDraft({ limitPct:-5 }),
      lim3: () => this.setDraft({ limitPct:-3 }), lim0: () => this.setDraft({ limitPct:0 }),
      orderTypeText: s.draft.orderType === 'limit'
        ? (limPrice.toLocaleString('ko-KR') + '원이 되면')
        : (marketOpen ? '지금 가격에 바로' : (scheduledFor + ' 장 시작 시가에')),
      hasWarn: !!warn, warnText: warn,

      reasonBtns: s.reasonOrder.map(i => REASONS[i]).map(r => ({
        label: r.label,
        style: 'display:flex;flex-direction:column;align-items:center;text-align:center;padding:16px 10px;border-radius:20px;cursor:pointer;min-height:64px;justify-content:center;' + (s.draft.reason === r.code
          ? 'background:#FFF4F9;box-shadow:inset 0 0 0 2px #F5327F'
          : glass),
        pick: () => this.setDraft({ reason: r.code })
      })),

      planBtns: PLANS.map(p => ({
        label: p.label,
        style: 'display:flex;align-items:center;gap:12px;padding:16px 18px;border-radius:22px;cursor:pointer;' + (s.draft.plan === p.code
          ? 'background:#FFF4F9;box-shadow:inset 0 0 0 2px #F5327F'
          : glass),
        pick: () => this.setDraft({ plan: p.code, targetPct: p.code === 'plan_target' ? s.draft.targetPct : null })
      })),
      showTarget: s.draft.plan === 'plan_target',
      tgtChip5: this.chip(s.draft.targetPct === 5), tgtChip10: this.chip(s.draft.targetPct === 10), tgtChip20: this.chip(s.draft.targetPct === 20),
      tgt5: () => this.setDraft({ targetPct:5 }), tgt10: () => this.setDraft({ targetPct:10 }), tgt20: () => this.setDraft({ targetPct:20 }),
      targetHint: s.draft.targetPct && st ? ('지금 ' + st.price.toLocaleString('ko-KR') + '원 → 목표 ' + Math.round(st.price * (1 + s.draft.targetPct/100)).toLocaleString('ko-KR') + '원') : '몇 퍼센트 오르면 팔지 골라봐',

      answerSentence: sentence,
      buyMemo: s.draft.memo, buyMemoCount: s.draft.memo.length,
      buyMemoInput: e => { const v = e.target.value.slice(0, 50); this.setDraft({ memo: v }); },
      buyCtaLabel: s.buyStep === 2 ? '주문하기' : '다음',
      buyCtaStyle: (nextOk && !(locked && s.buyStep === 2)) ? CTA_ON : CTA_OFF,
      subCtaStyle: SUB_CTA, mainCtaStyle: 'flex:1.3;' + CTA_ON,

      // ── 3단계 · 주문을 끝낸 축하 화면 ───────────────────────────────
      doneKicker: od.limit ? '기다리는 주문에 넣었어' : (od.scheduled ? '다음 장 주문을 맡아뒀어' : '주문 완료!'),
      doneHeadline: od.name
        ? (od.limit
          ? (od.limit.toLocaleString('ko-KR') + '원이 되면\n' + od.name + ' ' + odQty + '를 살게요!')
          : (od.scheduled
            ? (od.scheduledFor + ' 장이 열리면\n' + od.name + '을 시가로 살게요!')
            : (od.name + ' ' + odQty + '를\n주문했어요!')))
        : '주문했어요!',
      donePraise: od.limit
        ? '값이 목표에 닿을 때까지 키웅이가 지켜볼게.\n그동안 그 돈은 잠깐 맡아둘게!'
        : (od.scheduled
          ? '주문 접수와 체결은 달라. 거래가 확인된 첫날의 시가로 체결하고,\n휴장하거나 거래가 멈추면 돈을 그대로 맡아둘게.'
          : '왜 샀는지까지 남긴 건 정말 잘한 거야.\n나중에 아카이브에서 오늘의 너를 다시 만나자!'),
      doneStockName: od.name || '',
      doneQty: odQty,
      doneAmount: won(od.amount || 0),
      balloons: ['🎈','🎈','🎈','🎉','🎊'].map((e, i) => ({
        emoji: e,
        style: 'position:absolute;left:' + (8 + i * 21) + '%;bottom:-40px;font-size:' + (26 + (i % 3) * 7) + 'px;'
          + '--kwx:' + (i % 2 ? '' : '-') + (10 + i * 6) + 'px;'
          + 'animation:kwRise ' + (2.6 + i * 0.35) + 's ease-in ' + (i * 0.18) + 's forwards'
      })),
      confetti: Array.from({ length: 14 }, (_, i) => {
        const col = ['#F5327F','#FFC53D','#4FC3F7','#7BE3A0','#9B8CFF','#FF8AD0'][i % 6];
        return {
          style: 'position:absolute;top:-20px;left:' + (4 + i * 6.8) + '%;width:' + (7 + (i % 3) * 3) + 'px;height:'
            + (11 + (i % 4) * 3) + 'px;border-radius:2px;background:' + col + ';'
            + '--kwx:' + (i % 2 ? '' : '-') + (14 + (i % 5) * 12) + 'px;'
            + 'animation:kwFall ' + (2 + (i % 5) * 0.3) + 's linear ' + (i * 0.09) + 's forwards'
        };
      }),
      buyNext: () => {
        if (!nextOk) return;
        if (locked && s.buyStep === 2) return;
        if (s.buyStep < 2) { this.setState({ buyStep: s.buyStep + 1, showPad:false }); return; }
        const isLimit = s.draft.orderType === 'limit';
        const isScheduled = !isLimit && !marketOpen;
        const nm = this.state.acc[this.state.account];
        const hold = nm.holdings.slice();
        const pend = (nm.pending || []).slice();
        const orderId = 'ord_' + String(s.seq).padStart(4, '0');
        if (isLimit) {
          pend.push({ id:orderId, kind:'limit', side:'buy', code:st.code, amount:amount, reservedAmount:amount, price:limPrice, reservationMode:'cash' });
        } else if (isScheduled) {
          pend.push({
            id:orderId, kind:'next_open', side:'buy', code:st.code, amount:amount,
            reservedAmount:amount, requestMode:byQty ? 'qty' : 'amount', requestedQty:byQty ? qty : null,
            scheduledFor:scheduledFor, reservationMode:'cash', createdAt:new Date().toISOString()
          });
        } else {
          const idx = hold.map(h => h.code).indexOf(st.code);
          if (idx >= 0) {
            const h = hold[idx], nq = h.qty + qty;
            hold[idx] = { code: h.code, qty: nq, avg: (h.avg * h.qty + amount) / nq };
          } else {
            hold.push({ code: st.code, qty: qty, avg: price });
          }
        }
        const rec = {
          order_id: orderId,
          user_id: s.account === 'child' ? 'child_minji' : 'parent_mom',
          symbol: st.code, amount_krw: amount, qty: Math.round(qty * 10000) / 10000,
          order_type: isLimit ? 'limit' : 'market',
          limit_price: isLimit ? limPrice : null,
          order_status: isLimit ? 'pending' : (isScheduled ? 'scheduled' : 'filled'),
          scheduled_for: isScheduled ? scheduledFor : null,
          reason_code: s.draft.reason,
          plan_code: s.draft.plan,
          plan_target_price: s.draft.targetPct ? Math.round(price * (1 + s.draft.targetPct/100)) : null,
          memo: (s.draft.memo || '').trim() || null, ts: new Date().toISOString()
        };
        const acc2 = Object.assign({}, this.state.acc);
        acc2[this.state.account] = { name: nm.name, cash: nm.cash - grand, holdings: hold, pending: pend };
        // 축하 화면은 주문 직후 값으로 고정한다 (뒤에서 시세가 움직여도 문구가 바뀌지 않게)
        // 체결이 났으니 성향 스냅샷을 비워 다음 아카이브 진입에서 다시 계산하게 둔다
        this.set({
          acc: acc2, records: s.records.concat([rec]), seq: s.seq + 1, buyStep: 3,
          orderDone: { name: st.name, qty: qty, amount: amount, limit: isLimit ? limPrice : null, scheduled:isScheduled, scheduledFor:isScheduled ? scheduledFor : null, requestMode:byQty ? 'qty' : 'amount' }
        });
        if (!isLimit && !isScheduled) {
          this.saveTrade('buy', st.code, price, qty, s.draft.reason, {
            plan_code: rec.plan_code, plan_target_price: rec.plan_target_price, memo: rec.memo
          });
          this.flushTabViews(st.code);
          this.notifyChatBehavior({ kind:'trade_filled', stockId:'KRX:' + st.code, side:'buy' });
        }
      },
      buyBack: () => {
        if (s.buyStep === 2 && st) this.notifyChatBehavior({ kind:'order_confirmation_cancelled', stockId:'KRX:' + st.code, side:'buy' });
        if (s.buyStep === 3) { this.set({ screen:'portfolio' }); return; }
        if (s.buyStep === 1) this.set({ screen:'detail' }); else this.setState({ buyStep: s.buyStep - 1, showPad:false });
      },


      // ── 성장 아카이브 ────────────────────────────────────────────────────
      arcWeekLabel: arc.weekLabel,
      atReport: s.arcTab === 'report' || !s.arcTab, atReturn: s.arcTab === 'return',
      tabReport: () => this.set({ arcTab:'report', cardsOpen:false, cardSheet:null, famOpen:false }),
      tabReturn: () => this.set({ arcTab:'return', cardsOpen:false, cardSheet:null, famOpen:false }),
      tabReportStyle: arcTab(!s.arcTab || s.arcTab === 'report'), tabReturnStyle: arcTab(s.arcTab === 'return'),
      arcBodyStyle: 'flex:1;overflow-y:auto;overflow-x:hidden;padding:0 20px 8px;display:flex;flex-direction:column;gap:14px'
        + ((!s.arcTab || s.arcTab === 'report') ? ';justify-content:center' : ''),

      // 성향 카드
      styleTitle: arc.type.title,
      styleCardStyle: 'position:relative;border-radius:28px;padding:8px;cursor:pointer;background:linear-gradient(160deg,' + arcPal[0] + ' 0%,' + arcPal[1] + ' 46%,' + arcPal[2] + ' 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.7),0 0 0 1.5px ' + arcRgba(0.3) + ',0 2px 3px ' + arcRgba(0.2) + ',0 16px 22px -10px ' + arcRgba(0.35),
      styleInnerStyle: 'position:relative;border-radius:21px;padding:16px 15px 14px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.6),inset 0 0 0 1px rgba(255,255,255,0.36),inset 0 -20px 40px ' + arcRgba(0.1) + ';background:linear-gradient(158deg,rgba(255,255,255,0.42) 0%,rgba(255,255,255,0.14) 34%,rgba(255,255,255,0.06) 62%,rgba(255,255,255,0.2) 100%)',
      styleBlob1: 'position:absolute;left:-40px;top:-30px;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.6) 0%,rgba(255,255,255,0) 68%);filter:blur(18px);pointer-events:none',
      styleBlob2: 'position:absolute;right:-50px;bottom:-40px;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,' + arcRgba(0.16) + ' 0%,' + arcRgba(0) + ' 68%);filter:blur(22px);pointer-events:none',
      styleKickerStyle: 'font-size:11px;font-weight:800;color:' + arcRgba(0.85) + ';letter-spacing:0.14em;white-space:nowrap',
      styleChevStyle: 'font-size:11.5px;font-weight:800;color:' + arcRgba(0.6),
      styleTitleStyle: 'position:relative;text-align:center;font-size:26px;font-weight:900;color:' + arcInk + ';margin-top:5px;letter-spacing:-0.01em;text-shadow:0 1px 0 rgba(255,255,255,0.6)',
      styleImgStyle: 'width:186px;height:250px;margin:0 -20px -6px -18px;background:url(' + arc.typeImgUrl + ') center bottom/contain no-repeat;filter:drop-shadow(0 14px 16px ' + arcRgba(0.38) + ')',
      styleShadowStyle: 'width:104px;height:22px;margin-top:-10px;border-radius:50%;background:radial-gradient(ellipse at center,' + arcRgba(0.22) + ' 0%,' + arcRgba(0.06) + ' 46%,rgba(0,0,0,0) 72%)',
      styleGridStroke: arcRgba(0.18), styleAxisStroke: arcRgba(0.16),
      stylePolyFill: arcRgba(0.24), stylePolyStroke: arcInk,
      traits: arc.traits, radarGrid: arc.radarGrid, radarPoly: arc.radarPoly,

      // 축을 누르면 그 축 설명, 안 눌렀으면 유형 설명
      picked: arcPicked, hasPick: arcHasPick,
      pickedText: arcHasPick ? arcWrap(arcPicked.desc) : arc.type.desc.replace(/\s*\n\s*/g, ' '),
      pickedShowLead: !arcHasPick,
      pickedHeadStyle: arcHasPick ? 'display:flex;align-items:center;justify-content:center;gap:7px' : 'display:none',
      pickedLabelStyle: 'font-size:13.5px;font-weight:800;color:' + arcInk,
      pickedScoreStyle: 'font-size:14px;font-weight:900;color:' + arcInk + ';font-variant-numeric:tabular-nums',
      pickedTextStyle: 'flex:1;min-width:0;white-space:pre-line;text-align:' + (arcHasPick ? 'center' : 'left') + ';font-size:' + (arcHasPick ? '12px' : '12.5px') + ';font-weight:500;color:' + arcRgba(0.8) + ';line-height:1.65;' + (arcHasPick ? 'margin-top:3px;' : '') + 'text-wrap:pretty',
      pickedStyle: 'position:relative;display:flex;flex-direction:' + (arcHasPick ? 'column' : 'row') + ';align-items:center;gap:' + (arcHasPick ? '6px' : '10px') + ';margin-top:10px;border-radius:16px;padding:11px 14px;background:rgba(255,255,255,0.5);box-shadow:inset 0 1px 0 rgba(255,255,255,0.7),inset 0 0 0 1px rgba(255,255,255,0.4)',

      // 성향 상세 시트
      traitOpen: !!s.traitOpen,
      openTrait: () => this.set({ traitOpen: true }),
      closeTrait: () => this.set({ traitOpen: false }),
      tsPal: {
        sheet: 'position:absolute;left:0;right:0;bottom:0;z-index:7;max-height:80%;overflow-y:auto;border-radius:30px 30px 0 0;padding:14px 20px 26px;background:linear-gradient(160deg,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0.74) 100%),linear-gradient(160deg,' + arcPal[0] + ' 0%,' + arcPal[1] + ' 46%,' + arcPal[2] + ' 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.6),0 -18px 40px ' + arcRgba(0.32),
        grab: 'width:44px;height:5px;border-radius:999px;background:' + arcRgba(0.3) + ';margin:0 auto 14px',
        title: 'font-size:20px;font-weight:900;color:' + arcInk + ';letter-spacing:-0.01em',
        close: 'flex:none;white-space:nowrap;font-size:13.5px;font-weight:700;color:' + arcRgba(0.7) + ';cursor:pointer',
        lead: 'font-size:13px;font-weight:600;color:' + arcRgba(0.82) + ';line-height:1.7;margin-top:9px;text-wrap:pretty;white-space:pre-line',
        row: '',
        label: 'flex:1;min-width:0;font-size:15.5px;font-weight:900;color:' + arcInk,
        score: 'flex:none;font-size:17px;font-weight:900;color:' + arcInk + ';font-variant-numeric:tabular-nums',
        track: 'height:10px;border-radius:999px;background:' + arcRgba(0.14) + ';overflow:hidden;margin-top:9px',
        note: 'font-size:12.5px;font-weight:600;color:' + arcRgba(0.78) + ';line-height:1.65;margin-top:8px;text-wrap:pretty',
        icon: 'width:30px;height:30px;flex:none;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:15px;background:' + arcRgba(0.12)
      },

      // 카드 모아보기 · 가족 비교 (아카이브 안에서 열리는 두 화면)
      cardsOpen: !!s.cardsOpen && !s.famOpen, famOpen: !!s.famOpen,
      notCards: !s.cardsOpen && !s.famOpen,
      openCards: () => { const last = arc.cardCount - 1; this.set({ cardsOpen:true, cardActive:last, cardSheet:null }); this.jumpCard(last); },
      closeCards: () => this.set({ cardsOpen:false, cardSheet:null }),
      cardRailRef: el => this.bindCardRail(el),
      weekCards: arc.weekCards, arcCardDots: arc.cardDots,
      cardSheetOpen: s.cardSheet !== null && s.cardSheet !== undefined,
      closeCardSheet: () => this.set({ cardSheet: null }),
      cardSheet: arc.cardSheet,
      openFam: () => this.set({ famOpen:true, cardsOpen:false, cardSheet:null, famPick:'all' }),
      closeFam: () => this.set({ famOpen: false }),
      famPolys: arc.famPolys, famGrid: arc.famGrid, famAxes: arc.famAxes,
      famChips: arc.famChips, famCards: arc.famCards,

      // 수익률 탭
      runners: arc.runners,
      runStartLabelStyle: arc.runStartLabelStyle, runStartLineStyle: arc.runStartLineStyle,
      retHeroLabel: arc.retHeroLabel, retHeroPctText: arc.retHeroPctText, retHeroPctStyle: arc.retHeroPctStyle,
      retHeroTotalText: arc.retHeroTotalText,
      retCashLabel: '남은 현금', retCashText: arc.retCashText,
      retSectors: arc.retSectors, retNoHoldings: arc.retNoHoldings,
      retFeed: arc.retFeed, retFeedLabel: arc.retFeedLabel,
      secRailRef: el => { this.secRail = el; },
      secPrev: () => { if (this.secRail) this.secRail.scrollBy({ left: -118, behavior: 'smooth' }); },
      secNext: () => { if (this.secRail) this.secRail.scrollBy({ left: 118, behavior: 'smooth' }); },
      secModalOpen: !!arc.secModal,
      closeSecModal: () => this.set({ retSecModal: null }),
      stopTap: e => e.stopPropagation(),
      secModalEmoji: arc.secModalEmoji, secModalIconStyle: arc.secModalIconStyle,
      secModalName: arc.secModalName, secModalCount: arc.secModalCount,
      secModalValue: arc.secModalValue, secModalPctText: arc.secModalPctText,
      secModalPctStyle: arc.secModalPctStyle, secModalRows: arc.secModalRows,
      pnlPctText: (pnl >= 0 ? '+' : '') + (pnl / SEED * 100).toFixed(2) + '%',
      pnlPctStyle: 'font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (pnl >= 0 ? up : down),
      sellCount: (s.sellRecords || []).length,
      memoRecordCount: s.records.filter(r => r.memo).length + (s.sellRecords || []).filter(r => r.memo).length,
      detailViewCount: (s.events || []).filter(e => e.event === 'chart_detail_opened' || e.event === 'news_detail_opened').length,

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

      isSell: s.screen === 'sell',
      isSell1: s.sellStep === 1, isSell2: s.sellStep === 2, isSell3: s.sellStep === 3,
      sellInProgress: s.sellStep < 3,
      sellStepNo: s.sellStep,
      sProg1: prog2(1), sProg2: prog2(2), sProg3: prog2(3),
      sellBackGlyph: s.sellStep === 1 ? '✕' : (s.sellStep === 3 ? '✕' : '‹'),
      holdQtyText: heldQty.toFixed(2) + '주', holdAvgText: Math.round(heldAvg).toLocaleString('ko-KR') + '원',
      holdValueText: won(heldQty * price),
      holdPnlText: (heldPnl >= 0 ? '▲ +' : '▼ ') + Math.abs(Math.round(heldPnl)).toLocaleString('ko-KR') + '원',
      holdPnlStyle: 'font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:5px;white-space:nowrap;color:' + (heldPnl >= 0 ? up : down),

      // ── 1단계 · 얼마나 팔까 (매수 1단계와 같은 방식) ────────────────
      sellByQtyStyle: this.chip(sellByQty), sellByAmountStyle: this.chip(!sellByQty),
      pickSellByQty: () => { this.setSell({ sellBy:'qty' }); this.setState({ showSellPad:false }); },
      pickSellByAmount: () => { this.setSell({ sellBy:'amount' }); this.setState({ showSellPad:false }); },
      sellInputText: sellByQty
        ? (Math.round((s.sellDraft.qty || 0) * 100) / 100).toString()
        : (s.sellDraft.amountInput || 0).toLocaleString('ko-KR'),
      sellInputUnit: sellByQty ? '주' : '원',
      sellHint: sellQty > 0
        ? (won(sellProceeds) + '을 받게 돼')
        : (sellByQty ? '몇 주 팔지 골라봐' : '얼마어치 팔지 골라봐'),
      sellMaxHint: sellMaxQty > 0
        ? ('최대 ' + (Math.floor(sellMaxQty * 100) / 100) + '주까지 팔 수 있어 · ' + won(sellMaxQty * sellExecPrice))
        : '',
      sellQtyText: sellQty.toFixed(2),
      sellProceedsText: won(sellProceeds),
      sellOrderTypeText: s.sellDraft.orderType === 'limit' ? (sellLimPrice.toLocaleString('ko-KR') + '원이 되면') : '지금 가격에 바로',
      sellChips: (sellByQty
        ? [{ k:'all', label:'전부', v: sellMaxQty }, { k:'half', label:'절반', v: sellMaxQty / 2 }]
        : [{ k:'a3', label:'3만원', v: 30000 }, { k:'a5', label:'5만원', v: 50000 }]
      ).map(c => ({
        label: c.label,
        style: this.chip(s.sellPick === c.k),
        pick: () => {
          this.setState({ sellPick: c.k, showSellPad:false, sellQtyStr:'' });
          this.setSell(sellByQty ? { qty: c.v } : { amountInput: Math.min(c.v, Math.round(sellMaxQty * sellExecPrice)) });
        }
      })).concat([{
        label: '직접', style: this.chip(s.sellPick === 'custom'),
        pick: () => {
          this.setState({ sellPick:'custom', showSellPad:true, sellQtyStr:'' });
          this.setSell(sellByQty ? { qty: 0 } : { amountInput: 0 });
        }
      }]),
      showSellPad: !!s.showSellPad,
      sellPadKeys: (sellByQty ? ['1','2','3','4','5','6','7','8','9','.','0','←'] : ['1','2','3','4','5','6','7','8','9','←','0','000']).map(k => ({
        label: k,
        tap: () => {
          if (!sellByQty) {
            const cur = String(s.sellDraft.amountInput || '');
            const v = k === '←' ? cur.slice(0, -1) : cur + k;
            this.setSell({ amountInput: Math.min(Math.round(sellMaxQty * sellExecPrice), parseInt(v || '0', 10) || 0) });
            return;
          }
          const cur = s.sellQtyStr || '';
          let v;
          if (k === '←') v = cur.slice(0, -1);
          else if (k === '.') v = cur.indexOf('.') >= 0 ? cur : (cur === '' ? '0.' : cur + '.');
          else v = cur + k;
          this.setState({ sellQtyStr: v });
          this.setSell({ qty: parseFloat(v || '0') || 0 });
        }
      })),
      sellMktStyle: this.chip(s.sellDraft.orderType !== 'limit'),
      sellLimStyle: this.chip(s.sellDraft.orderType === 'limit'),
      pickSellMarket: () => this.setSell({ orderType:'market' }),
      pickSellLimit: () => this.setSell({ orderType:'limit' }),
      showSellLimit: s.sellDraft.orderType === 'limit',
      sellLimitPriceText: sellLimPrice.toLocaleString('ko-KR'),
      sellLimitDiffText: sellLimPct === 0 ? '지금 값 그대로야' : ('지금보다 ' + sellLimPct + '% 높은 값이야'),
      // 팔 때는 지금보다 높은 값을 기다린다
      sellLimitChips: [0, 3, 5, 10].map(v => ({
        label: v === 0 ? '지금값' : ('+' + v + '%'),
        style: this.chip(sellLimPct === v),
        pick: () => this.setSell({ limitPct: v })
      })),
      hasSellWarn: !!sellWarn, sellWarnText: sellWarn,

      // ── 2단계 · 사던 날의 기록 + 왜 파는지 ──────────────────────────
      retroAgoText: heldDays === 0 ? '오늘의 나' : (heldDays + '일 전의 나'),
      retroSentence: buyRec ? ([
        (REASONS.filter(r => r.code === buyRec.reason_code)[0] || {}).short,
        (PLANS.filter(p => p.code === buyRec.plan_code)[0] || {}).short
      ].filter(Boolean).join(',\n') + ' 샀어.') : '기록이 없어.',
      // 매수 때 남긴 것들을 그대로 다시 보여준다
      retroRows: buyRec ? [
        { label: '산 날', value: (d => (d.getMonth() + 1) + '월 ' + d.getDate() + '일')(new Date(buyRec.ts)) },
        { label: '산 만큼', value: (Math.round(buyRec.qty * 100) / 100) + '주 · ' + won(buyRec.amount_krw) },
        { label: '왜 샀는지', value: (REASONS.filter(r => r.code === buyRec.reason_code)[0] || {}).label || '기록 없음' },
        { label: '언제까지', value: (PLANS.filter(p => p.code === buyRec.plan_code)[0] || {}).label || '기록 없음' }
      ].concat(buyRec.plan_target_price ? [{ label: '목표 가격', value: won(buyRec.plan_target_price) }] : [])
       .concat(buyRec.memo ? [{ label: '그때 한 말', value: buyRec.memo }] : []) : [],
      hasRetroMemo: !!(buyRec && buyRec.memo), retroMemo: buyRec ? buyRec.memo : '',
      retroPnlText: (heldPct >= 0 ? '+' : '') + heldPct.toFixed(1) + '%',
      retroHeldText: heldDays === 0 ? '오늘' : (heldDays + '일'),

      sellReasonBtns: s.sellReasonOrder ? s.sellReasonOrder.map(i => SELL_REASONS[i]).map(r => ({
        label: r.label,
        style: 'display:flex;flex-direction:column;align-items:center;text-align:center;padding:16px 10px;border-radius:20px;cursor:pointer;min-height:64px;justify-content:center;' + (s.sellDraft.reason === r.code
          ? 'background:#FFF4F9;box-shadow:inset 0 0 0 2px #F5327F'
          : glass),
        pick: () => this.setSell({ reason: r.code })
      })) : [],

      planMatched: showJudge && planMatch === true, planChanged: showJudge && planMatch === false,
      changeQuestion: buyRec ? ('처음에는 ' + ((PLANS.filter(p => p.code === buyRec.plan_code)[0] || {}).short || '') + ' 가지려고 했었네. 무엇이 달라졌어?') : '무엇이 달라졌어?',
      changeBtns: CHANGES.map(c => ({
        label: c.label,
        style: 'display:flex;align-items:center;gap:12px;padding:15px 17px;border-radius:22px;cursor:pointer;' + (s.sellDraft.change === c.code
          ? 'background:#FFF4F9;box-shadow:inset 0 0 0 2px #F5327F'
          : glass),
        pick: () => this.setSell({ change: c.code })
      })),

      sellSentence: sellReason ? (sellReason.short + ' 팔기로 했어') : '',
      sellCtaLabel: s.sellStep === 2 ? '팔기' : '다음',
      sellCtaStyle: (sellOk && !(locked && s.sellStep === 2)) ? CTA_ON : CTA_OFF,

      // ── 3단계 · 매도 완료 (축하 연출 없음) ──────────────────────────
      sellDoneKicker: sd.limit ? '기다리는 주문에 넣었어' : (sd.scheduled ? '다음 장 주문을 맡아뒀어' : '매도 완료'),
      sellDoneHeadline: sd.name
        ? (sd.limit
          ? (sd.limit.toLocaleString('ko-KR') + '원이 되면\n' + sd.name + ' ' + sdQty + '를 팔게요')
          : (sd.scheduled
            ? (sd.scheduledFor + ' 장이 열리면\n' + sd.name + ' ' + sdQty + '를 시가로 팔게요')
            : (sd.name + ' ' + sdQty + '를\n팔았어요')))
        : '팔았어요',
      sellDoneNote: sd.limit
        ? '값이 목표에 닿을 때까지 키웅이가 지켜볼게.\n그동안 그 주식은 잠깐 맡아둘게.'
        : (sd.scheduled
          ? '주문 접수와 체결은 달라. 거래가 확인된 첫날의 시가로 체결하고,\n휴장하거나 거래가 멈추면 주식을 그대로 맡아둘게.'
          : '왜 팔았는지까지 남겨뒀어.\n아카이브에서 산 날과 판 날을 같이 볼 수 있어.'),
      sellDoneStock: sd.name || '',
      sellDoneQty: sdQty,
      sellDoneMoneyLabel: sd.limit || sd.scheduled ? '예상 금액' : '받은 돈',
      sellDoneProceeds: won(sd.proceeds || 0),
      sellMemo: s.sellDraft.memo, sellMemoCount: s.sellDraft.memo.length,
      sellMemoInput: e => { const v = e.target.value.slice(0, 50); this.setSell({ memo: v, memoSaved: false }); },
      sellMemoBtnLabel: s.sellDraft.memoSaved ? '저장됐어 ✓' : '저장하기',
      sellMemoBtnStyle: s.sellDraft.memoSaved
        ? 'font-size:14px;font-weight:700;color:#8E93A8;padding:11px 18px;border-radius:999px;white-space:nowrap;background:#F1F2F8'
        : 'font-size:14px;font-weight:700;color:#fff;padding:11px 20px;border-radius:999px;cursor:pointer;white-space:nowrap;background:#F5327F',
      saveSellMemo: () => {
        if (s.sellDraft.memoSaved) return;
        const v = (s.sellDraft.memo || '').trim();
        this.setState(x => {
          const recs = (x.sellRecords || []).slice();
          if (recs.length) recs[recs.length - 1] = Object.assign({}, recs[recs.length - 1], { memo: v || null });
          const n = Object.assign({}, x, {
            sellRecords: recs,
            sellDraft: Object.assign({}, x.sellDraft, { memoSaved: true })
          });
          this.persist(n); return n;
        });
      },

      sellBack: () => {
        if (s.sellStep === 2 && st) this.notifyChatBehavior({ kind:'order_confirmation_cancelled', stockId:'KRX:' + st.code, side:'sell' });
        if (s.sellStep === 3) { this.set({ screen:'portfolio' }); return; }
        if (s.sellStep === 1) this.set({ screen:'portfolio' }); else this.setState({ sellStep: s.sellStep - 1 });
      },
      sellNext: () => {
        if (!sellOk) return;
        if (locked && s.sellStep === 2) return;
        if (s.sellStep === 1) { this.retroAt = Date.now(); this.setState({ sellStep: 2 }); return; }
        this.retroMs = this.retroAt ? Date.now() - this.retroAt : 0;
        const isLimit = s.sellDraft.orderType === 'limit';
        const isScheduled = !isLimit && !marketOpen;
        const nm = this.state.acc[this.state.account];
        const hold = nm.holdings.slice();
        const pend = (nm.pending || []).slice();
        const orderId = 'ord_' + String(s.seq).padStart(4, '0');
        if (!isLimit && !isScheduled) {
          const idx = hold.map(h => h.code).indexOf(st.code);
          if (idx >= 0) {
            const left = hold[idx].qty - sellQty;
            if (left < 0.005) hold.splice(idx, 1); else hold[idx] = { code: hold[idx].code, qty: left, avg: hold[idx].avg };
          }
        }
        if (isLimit || isScheduled) pend.push({
          id:orderId, kind:isLimit ? 'limit' : 'next_open', code:st.code, side:'sell', qty:sellQty,
          reservedQty:sellQty, price:isLimit ? sellLimPrice : null, scheduledFor:isScheduled ? scheduledFor : null,
          reservationMode:'held', createdAt:new Date().toISOString()
        });
        const rec = {
          order_id: orderId,
          user_id: s.account === 'child' ? 'child_minji' : 'parent_mom',
          symbol: st.code, qty: Math.round(sellQty * 10000) / 10000,
          linked_buy_order_id: buyRec ? buyRec.order_id : null,
          order_type: isLimit ? 'limit' : 'market',
          limit_price: isLimit ? sellLimPrice : null,
          order_status: isLimit ? 'pending' : (isScheduled ? 'scheduled' : 'filled'),
          amount_krw: (!isLimit && !isScheduled) ? sellProceeds : null,
          scheduled_for: isScheduled ? scheduledFor : null,
          sell_reason_code: s.sellDraft.reason,
          plan_match: planMatch,
          change_reason_code: (showJudge && planMatch === false) ? s.sellDraft.change : null,
          retro_card_viewed_ms: this.retroMs || 0,
          pnl_pct_at_sell: Math.round(heldPct * 10) / 10,
          held_days: heldDays, avg: heldAvg, memo: null, ts: new Date().toISOString()
        };
        const acc2 = Object.assign({}, this.state.acc);
        acc2[this.state.account] = {
          name: nm.name, cash: nm.cash + ((!isLimit && !isScheduled) ? sellProceeds : 0), holdings: hold, pending: pend
        };
        this.set({
          acc: acc2, sellRecords: (s.sellRecords || []).concat([rec]),
          seq: s.seq + 1, sellStep: 3,
          sellDraft: Object.assign({}, s.sellDraft, { memo:'', memoSaved:false }),
          sellDone: { name: st.name, qty: sellQty, proceeds: sellProceeds, limit: isLimit ? sellLimPrice : null, scheduled:isScheduled, scheduledFor:isScheduled ? scheduledFor : null }
        });
        if (isLimit || isScheduled) return;
        this.saveTrade('sell', st.code, price, sellQty, s.sellDraft.reason, {
          plan_match: rec.plan_match, plan_changed_reason: rec.change_reason_code
        });
        const behaviorEvent = { kind:'trade_filled', stockId:'KRX:' + st.code, side:'sell' };
        if (heldRow && Number.isFinite(heldAvg) && heldAvg > 0 && Number.isFinite(price)) {
          behaviorEvent.realizedPnlPct = (price - heldAvg) / heldAvg * 100;
        }
        this.notifyChatBehavior(behaviorEvent);
      },

      hasPending: (m.pending || []).length > 0,
      pendingCards: (m.pending || []).map(p => {
        const x = u.stocks.filter(y => y.code === p.code)[0];
        const side = p.side || 'buy';
        const isNextOpen = p.kind === 'next_open';
        const reservedAmount = Number(p.reservedAmount ?? p.amount) || 0;
        const reservedQty = Number(p.reservedQty ?? p.qty) || 0;
        return {
          name: x ? x.name : p.code,
          desc: isNextOpen
            ? (p.scheduledFor + ' 장 시작 시가 · ' + (side === 'sell' ? reservedQty.toFixed(2) + '주 매도 예약' : won(reservedAmount) + ' 매수 예약'))
            : ((Number(p.price) || 0).toLocaleString('ko-KR') + '원이 되면 ' + (side === 'sell' ? reservedQty.toFixed(2) + '주 매도' : won(reservedAmount) + ' 매수')),
          cancel: () => {
            this.setState(state => {
              const acc3 = Object.assign({}, state.acc);
              acc3[state.account] = cancelPendingOrder(state.acc[state.account], p);
              const next = Object.assign({}, state, {
                acc:acc3,
                records: side === 'buy' ? markOrderCancelled(state.records || [], p.id, new Date()) : state.records,
                sellRecords: side === 'sell' ? markOrderCancelled(state.sellRecords || [], p.id, new Date()) : state.sellRecords
              });
              this.persist(next); return next;
            });
            this.notifyChatBehavior({ kind:'order_confirmation_cancelled', stockId:'KRX:' + p.code, side:side });
          }
        };
      }),

      hasHoldings: holdingCards.length > 0, noHoldings: holdingCards.length === 0,
      holdingCards: holdingCards,
      recordCount: s.records.length,

      backBtnStyle: 'width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)',
      stepPillStyle: 'min-width:58px;text-align:center;border-radius:999px;padding:8px 12px;font-size:14.5px;font-weight:700;font-variant-numeric:tabular-nums;color:#A9AEC4;background:#F1F2F8',

      navBarStyle: 'flex:none;display:flex;align-items:center;gap:8px;padding:10px 14px 20px',
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
