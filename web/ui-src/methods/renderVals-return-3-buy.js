
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
