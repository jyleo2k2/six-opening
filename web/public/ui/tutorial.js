/* 영웅 키움 — 튜토리얼 모드
 *
 * 초등~중등 아이가 처음 들어와도 버튼이 뭘 하는 건지, 그게 투자에서 무슨 뜻인지
 * 알 수 있게 한다. 강조할 곳만 남기고 나머지를 어둡게 덮는다.
 *
 * 앱 코드(app.html)를 건드리지 않고 동작한다. 앱은 대상 요소에 id 만 달아 두고,
 * 여기서 실행 시점에 위치를 잰다. 좌표를 박아두면 레이아웃이 조금만 움직여도
 * 구멍이 엉뚱한 데 뚫린다.
 *
 * 딤은 pointer-events:none 이다. 보기에만 어둡고 클릭은 그대로 통과한다.
 * 강조된 곳만 누르게 막으면 매수 단계에서 '다음'을 못 눌러 흐름이 멈춘다.
 * 대신 지금 어느 단계인지는 화면 상태에서 읽어 오므로 순서가 어긋나지 않는다.
 */
(function () {
  'use strict';

  // 한 단계 = 강조할 곳 + 이 버튼이 뭘 하는지 + 그게 투자에서 무슨 뜻인지.
  // screen 은 "이 화면에 있는가"를 판정하는 기준 id 다.
  var STEPS = [
    { screen: 'tut-chips', anchors: ['tut-chips'],
      title: '회사 종류 고르기',
      what: '여기서 회사 종류를 골라. 맨 왼쪽 🔥는 오늘 가장 많이 오른 회사부터 보여줘.',
      term: '섹터',
      concept: '비슷한 일을 하는 회사끼리 묶은 게 섹터야. 게임 회사는 게임 섹터, 라면 만드는 회사는 식품 섹터. 한 섹터가 몽땅 오르거나 떨어질 때가 있어서, 여러 섹터를 나눠 가지면 더 안전해.' },

    { screen: 'tut-chips', anchors: ['tut-cards'],
      title: '회사 카드 넘겨보기',
      what: '손가락으로 옆으로 밀면 다른 회사가 나와. 카드에 오늘 가격과 얼마나 올랐는지가 적혀 있어.',
      term: '주식과 주가',
      concept: '주식은 회사를 아주 잘게 나눈 조각이야. 한 조각을 사면 너도 그 회사의 주인 중 한 명이 돼. 그 조각 하나 값이 주가야. 빨간색은 어제보다 오른 거고, 파란색은 내린 거야.' },

    { screen: 'tut-buy-cta', anchors: ['tut-buy-cta'],
      title: '사러 가기',
      what: '이 버튼을 누르면 이 회사 주식을 사러 가. 바로 사지는 않고, 몇 가지를 먼저 물어봐.',
      term: '매수',
      concept: '주식을 사는 걸 매수라고 해. 가게에서 물건 사는 거랑 비슷한데 다른 점이 하나 있어. 값이 계속 바뀌어서, 내가 산 뒤에 오를 수도 내릴 수도 있다는 거야. 그래서 사기 전에 왜 사는지 생각해 보는 게 중요해.' },

    { screen: 'tut-buy1', anchors: ['tut-buy1', 'tut-next'],
      title: '얼마나 살까',
      what: '쓸 금액을 골라. 다 고르면 아래 다음을 눌러.',
      term: '분산',
      concept: '가진 돈을 한 회사에 몽땅 넣으면, 그 회사가 잘못됐을 때 전부 잃어. 여러 곳에 나눠 담으면 한 곳이 내려가도 다른 곳이 버텨줘. 이걸 분산이라고 해.' },

    { screen: 'tut-buy2', anchors: ['tut-buy2', 'tut-next'],
      title: '왜 사는지 고르기',
      what: '이 회사를 왜 사고 싶은지 골라. 정답은 없어. 솔직하게 고르면 돼.',
      term: '투자 이유',
      concept: '이유를 남겨두면 나중에 다시 볼 수 있어. 잘됐을 때도 안 됐을 때도 "그때 나는 이렇게 생각했구나" 하고 알 수 있거든. 이유 없이 산 건 다음에 배울 게 없어.' },

    { screen: 'tut-buy3', anchors: ['tut-buy3', 'tut-next'],
      title: '얼마나 확신해?',
      what: '얼마나 자신 있는지 막대를 밀어서 알려줘.',
      term: '확신도',
      concept: '아주 확신할 때랑 그냥 느낌이 좋을 때는 다르게 행동하는 게 좋아. 확신이 크지 않으면 조금만 사보는 것도 방법이야. 나중에 진짜 잘 맞았는지 같이 확인해 볼 거야.' },

    { screen: 'tut-buy4', anchors: ['tut-buy4', 'tut-next'],
      title: '언제까지 가질까',
      what: '얼마나 오래 갖고 있을 생각인지 골라.',
      term: '투자 계획',
      concept: '미리 정해두면 가격이 흔들릴 때 덜 놀라. 계획 없이 사면 조금 내렸을 때 겁나서 팔고, 조금 올랐을 때 아쉬워서 못 팔아. 언제까지 가질지 먼저 정하는 게 어른 투자자들이 하는 방법이야.' },

    { screen: 'tut-buy5', anchors: ['tut-buy5', 'tut-next'],
      title: '주문 넣기',
      what: '고른 내용을 마지막으로 확인하고 주문 넣기를 누르면 끝이야.',
      term: '체결',
      concept: '주문을 넣으면 사겠다는 사람과 팔겠다는 사람이 만나야 거래가 돼. 이게 이뤄지는 걸 체결이라고 해. 체결되면 그 주식이 진짜 내 것이 되고, 지갑에서 그만큼 돈이 빠져나가.' }
  ];

  var DIM = 'rgba(4,10,32,0.76)';
  var PAD = 8;           // 구멍을 요소보다 이만큼 넉넉히 판다
  var state = { on: false, index: 0, read: false, screenId: null };
  var el = {};

  function screenBox() {
    var all = document.querySelectorAll('div');
    for (var i = 0; i < all.length; i++) {
      if (Math.abs(all[i].clientWidth - 402) < 2 && Math.abs(all[i].clientHeight - 874) < 2) return all[i];
    }
    return null;
  }

  /** 같은 id 가 여러 화면 분기에 있을 수 있다. 실제로 그려진 것만 고른다. */
  function visible(id) {
    var nodes = document.querySelectorAll('#' + id);
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return nodes[i];
    }
    return null;
  }

  /** 지금 화면에 맞는 단계를 찾는다. 앱을 따라가므로 순서가 어긋날 수 없다. */
  function stepForScreen() {
    for (var i = 0; i < STEPS.length; i++) if (visible(STEPS[i].screen)) return i;
    return -1;
  }

  function build() {
    var box = screenBox();
    if (!box) return false;
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative';

    var root = document.createElement('div');
    root.id = 'tut-root';
    root.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;z-index:6;pointer-events:none;display:none';
    root.innerHTML =
      '<svg id="tut-svg" width="402" height="874" style="position:absolute;left:0;top:0;pointer-events:none">' +
        '<defs><mask id="tut-mask">' +
          '<rect width="402" height="874" fill="#fff"/><g id="tut-holes"></g>' +
        '</mask></defs>' +
        '<rect width="402" height="874" fill="' + DIM + '" mask="url(#tut-mask)"/>' +
        '<g id="tut-rings"></g>' +
      '</svg>' +
      '<div id="tut-card" style="position:absolute;left:16px;right:16px;pointer-events:auto;' +
        'background:linear-gradient(157deg,#FFFFFF 0%,#FFFFFF 46%,#F6F6FC 100%);border-radius:24px;padding:17px 19px;' +
        'box-shadow:0 20px 44px rgba(0,6,30,0.45),inset 0 2px 1px rgba(255,255,255,1),inset 0 0 0 1px rgba(255,255,255,0.7)">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span id="tut-count" style="font-size:11.5px;font-weight:800;color:#fff;background:#F5327F;border-radius:999px;padding:3px 9px;white-space:nowrap"></span>' +
          '<span id="tut-title" style="font-size:16.5px;font-weight:800;color:#01185A;letter-spacing:-0.01em"></span>' +
        '</div>' +
        '<div id="tut-what" style="font-size:13.5px;font-weight:500;color:#5C6280;line-height:1.65;margin-top:9px;text-wrap:pretty"></div>' +
        '<div style="margin-top:12px;padding-top:12px;border-top:1px solid #EFEFF5">' +
          '<div style="display:flex;align-items:center;gap:6px">' +
            '<span style="font-size:14px">💡</span>' +
            '<span id="tut-term" style="font-size:13px;font-weight:800;color:#D5327A"></span>' +
          '</div>' +
          '<div id="tut-concept" style="font-size:13px;font-weight:500;color:#6E7488;line-height:1.7;margin-top:6px;text-wrap:pretty"></div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:9px;margin-top:14px">' +
          '<div id="tut-quit" style="flex:none;font-size:13px;font-weight:600;color:#A9AEC4;cursor:pointer;padding:9px 4px">그만 보기</div>' +
          '<div style="flex:1"></div>' +
          '<div id="tut-next-btn" style="flex:none;font-size:13.5px;font-weight:800;color:#fff;cursor:pointer;' +
            'background:linear-gradient(180deg,#FFA0C6 0%,#F663A1 62%,#EE4A8E 100%);border-radius:999px;padding:10px 20px;' +
            'box-shadow:0 8px 15px -5px rgba(214,54,124,0.45),inset 0 2px 3px rgba(255,255,255,0.45)">알겠어</div>' +
        '</div>' +
      '</div>' +
      '<div id="tut-mini" style="position:absolute;left:16px;right:16px;bottom:76px;pointer-events:auto;display:none;' +
        'align-items:center;gap:9px;background:rgba(4,10,32,0.88);border-radius:999px;padding:9px 10px 9px 16px;' +
        'box-shadow:0 12px 26px rgba(0,6,30,0.4)">' +
        '<span style="font-size:13px">💡</span>' +
        '<span id="tut-mini-text" style="flex:1;min-width:0;font-size:12.5px;font-weight:600;color:#fff;' +
          'white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></span>' +
        '<span id="tut-again" style="flex:none;font-size:12px;font-weight:800;color:#01185A;background:#fff;' +
          'border-radius:999px;padding:6px 12px;cursor:pointer;white-space:nowrap">다시 보기</span>' +
        '<span id="tut-mini-quit" style="flex:none;font-size:15px;color:#A9AEC4;cursor:pointer;padding:0 6px">✕</span>' +
      '</div>';
    box.appendChild(root);

    var help = document.createElement('div');
    help.id = 'tut-help';
    help.title = '튜토리얼';
    help.style.cssText = 'position:absolute;right:14px;bottom:80px;z-index:5;width:44px;height:44px;border-radius:999px;' +
      'display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;cursor:pointer;' +
      'background:linear-gradient(180deg,#FFA0C6 0%,#F663A1 62%,#EE4A8E 100%);' +
      'box-shadow:0 10px 20px -6px rgba(214,54,124,0.5),inset 0 2px 3px rgba(255,255,255,0.45)';
    help.textContent = '?';
    help.addEventListener('click', start);
    box.appendChild(help);

    el = {
      box: box, root: root, help: help,
      svg: root.querySelector('#tut-svg'),
      holes: root.querySelector('#tut-holes'), rings: root.querySelector('#tut-rings'),
      card: root.querySelector('#tut-card'), mini: root.querySelector('#tut-mini'),
      miniText: root.querySelector('#tut-mini-text'),
      count: root.querySelector('#tut-count'), title: root.querySelector('#tut-title'),
      what: root.querySelector('#tut-what'), term: root.querySelector('#tut-term'),
      concept: root.querySelector('#tut-concept')
    };
    root.querySelector('#tut-quit').addEventListener('click', stop);
    root.querySelector('#tut-mini-quit').addEventListener('click', stop);
    root.querySelector('#tut-next-btn').addEventListener('click', advance);
    root.querySelector('#tut-again').addEventListener('click', function () { state.read = false; draw(); });
    return true;
  }

  function rectOf(node) {
    var b = el.box.getBoundingClientRect(), r = node.getBoundingClientRect();
    return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
  }

  function draw() {
    var step = STEPS[state.index];
    if (!step) return stop();

    // 읽고 나면 접는다. 딤과 설명이 계속 떠 있으면 정작 버튼을 누를 수가 없다.
    if (state.read) {
      el.holes.innerHTML = '';
      el.rings.innerHTML = '';
      el.svg.style.display = 'none';
      el.card.style.display = 'none';
      el.mini.style.display = 'flex';
      el.miniText.textContent = step.title;
      return;
    }
    el.svg.style.display = 'block';
    el.card.style.display = 'block';
    el.mini.style.display = 'none';

    var boxes = [];
    for (var i = 0; i < step.anchors.length; i++) {
      var node = visible(step.anchors[i]);
      if (node) boxes.push(rectOf(node));
    }
    if (!boxes.length) return;   // 아직 안 그려졌다. 다음 관찰에서 다시 본다.

    var holes = '', rings = '';
    for (var j = 0; j < boxes.length; j++) {
      var b = boxes[j];
      var x = Math.max(0, b.x - PAD), y = Math.max(0, b.y - PAD);
      var w = Math.min(402 - x, b.w + PAD * 2), h = Math.min(874 - y, b.h + PAD * 2);
      var a = ' x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="16"';
      holes += '<rect' + a + ' fill="#000"/>';
      rings += '<rect' + a + ' fill="none" stroke="#FFC7DE" stroke-width="2.5" opacity="0.9"/>';
    }
    el.holes.innerHTML = holes;
    el.rings.innerHTML = rings;

    el.count.textContent = (state.index + 1) + ' / ' + STEPS.length;
    el.title.textContent = step.title;
    el.what.textContent = step.what;
    el.term.textContent = step.term;
    el.concept.textContent = step.concept;

    // 설명 카드는 강조된 곳을 가리지 않는 쪽에 붙인다.
    var top = boxes[0].y, bottom = boxes[0].y + boxes[0].h;
    for (var k = 1; k < boxes.length; k++) {
      top = Math.min(top, boxes[k].y);
      bottom = Math.max(bottom, boxes[k].y + boxes[k].h);
    }
    var cardH = el.card.offsetHeight || 240;
    if (874 - bottom - 16 >= cardH + 14) {          // 아래에 자리가 있으면 아래
      el.card.style.top = (bottom + 14) + 'px'; el.card.style.bottom = 'auto';
    } else if (top - 16 >= cardH + 14) {            // 아니면 위
      el.card.style.top = (top - 14 - cardH) + 'px'; el.card.style.bottom = 'auto';
    } else {                                        // 둘 다 좁으면 아래에 고정
      el.card.style.top = 'auto'; el.card.style.bottom = '16px';
    }
  }

  function advance() {
    // 같은 화면에 아직 볼 게 남았으면 그 다음 단계로.
    var next = state.index + 1;
    if (next < STEPS.length && STEPS[next].screen === STEPS[state.index].screen) {
      state.index = next; draw(); return;
    }
    // 아니면 접는다. 이제 아이가 직접 눌러서 다음 화면으로 간다.
    state.read = true;
    draw();
  }

  function sync() {
    if (!state.on) return;
    var found = stepForScreen();
    if (found >= 0 && STEPS[found].screen !== state.screenId) {
      // 화면이 바뀌면 그 화면의 첫 단계로 옮기고 다시 펼친다. 뒤로 가도 따라온다.
      // 단계 번호가 아니라 화면 id 로 비교한다. 같은 화면 안에서 단계를 넘겼을 때
      // 다시 펼쳐지면 방금 읽은 설명이 또 뜬다.
      state.screenId = STEPS[found].screen;
      state.index = found;
      state.read = false;
    }
    draw();
  }

  function start() {
    if (!el.root && !build()) return;
    state.on = true;
    state.read = false;
    var found = stepForScreen();
    state.index = found >= 0 ? found : 0;
    state.screenId = STEPS[state.index] ? STEPS[state.index].screen : null;
    el.root.style.display = 'block';
    el.help.style.display = 'none';
    draw();
  }

  function stop() {
    state.on = false;
    if (el.root) el.root.style.display = 'none';
    if (el.help) el.help.style.display = 'flex';
  }

  function boot() {
    if (!build()) return setTimeout(boot, 300);
    // 앱이 다시 그리면 강조할 위치도 바뀌므로 다시 재야 한다.
    // MutationObserver 를 el.box 에 걸어 봤지만 이 런타임에서는 콜백이 오지 않았다.
    // 튜토리얼이 켜져 있는 동안만 짧게 확인한다. 프로토타입에서 이 정도 폴링은 싸다.
    setInterval(function () { if (state.on) sync(); }, 200);
    window.addEventListener('resize', function () { if (state.on) draw(); });
    window.KW_TUTORIAL = { start: start, stop: stop, steps: STEPS, state: state, sync: sync };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
