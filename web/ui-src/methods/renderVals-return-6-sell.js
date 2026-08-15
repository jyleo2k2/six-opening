
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
        if (isLimit || isScheduled) {
          // 미체결 매도는 서버 주문 잔고가 원본이어야 한다. 매도는 보유에서 빼지 않고
          // 수량만 잠그므로(reserve_order) 잠글 수량을 함께 보낸다.
          this.reserveOrder({
            side:'sell', stock_code:st.code,
            order_type: isLimit ? 'limit' : 'market',
            limit_price: isLimit ? sellLimPrice : null,
            request_mode: 'quantity',
            requested_quantity: sellQty,
            scheduled_for: isScheduled ? scheduledFor : null,
            reason: s.sellDraft.reason,
            plan_match: rec.plan_match, plan_changed_reason: rec.change_reason_code
          });
          return;
        }
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
