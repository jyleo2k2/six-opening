/* 종목 카드 렌더러 (검토용 페이지 공용)
 * window.KW_CARD(stock, universe, opt) → 카드 HTML 문자열
 * opt.outer : 카드 바깥 처리 — 'glow'(어두운 배경용, 기본) | 'aura'(밝은 배경용) | 'flat'
 * 앱 본체(app.html)는 자체 런타임이라 같은 값을 복제해 쓴다. 수치를 바꾸면 양쪽 다 고칠 것.
 */
(function () {
  var mixW = function (hx, w) {
    var n = parseInt(hx.slice(1), 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return Math.round(v + (255 - v) * w); });
    return '#' + c.map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  };
  var G = function (s) { return ' style="filter:drop-shadow(0 0 ' + s + ')"'; };

  window.KW_CARD = function (x, u, opt) {
    opt = opt || {};
    var br = (u.brands || {})[x.code] || { cat: '', color: '#5B87E8', dark: false };
    var B = br.color, BL = mixW(B, 0.45), BI = mixW(B, 0.66);
    var up = x.change >= 0, CL = up ? '#E8322E' : '#1668DC', CB = mixW(CL, 0.42);
    var logo = (u.logos || {})[x.code] || '';
    var sp = x.spark || [], W = 127, H = 104, PL = 5, PR = 15, PY = 12, N = Math.max(2, sp.length);
    var pts = sp.map(function (v, i) { return [PL + i * ((W - PL - PR) / (N - 1)), (H - PY) - (v / 100) * (H - PY * 2)]; });
    var xy = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); });
    var last = pts[pts.length - 1] || [W - PR, H / 2];
    var priceText = x.price.toLocaleString('ko-KR');
    var pf = priceText.length >= 9 ? 24 : priceText.length === 8 ? 26 : priceText.length === 7 ? 28 : 30;
    var gid = 'g' + x.code + (opt.key || '');

    // 카드 바깥 — 배경 밝기에 따라 다르게
    var outer = opt.outer || 'glow';
    var shadow;
    if (outer === 'aura') {
      // 밝은 배경: 넓은 번짐은 사라지므로 짧고 진한 색 그림자 + 선명한 림
      shadow = '0 18px 30px -14px rgba(20,16,40,0.5),0 10px 26px -10px ' + CL + '8C,0 0 0 1.5px ' + CL + '73';
    } else if (outer === 'flat') {
      shadow = '0 20px 38px -16px rgba(20,16,40,0.45)';
    } else {
      shadow = '0 30px 56px -18px rgba(0,0,0,0.85),0 0 40px -14px ' + CL + 'B3';
    }

    return '<div style="position:relative;overflow:hidden;flex:none;width:310px;height:340px;border-radius:34px;scroll-snap-align:center;background:radial-gradient(78% 56% at 17% 3%,' + B + '5E 0%,rgba(12,18,38,0) 66%),radial-gradient(62% 48% at 97% 97%,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0) 72%),linear-gradient(146deg,#101B39 0%,#0A1024 46%,#05070E 100%);box-shadow:' + shadow + '">'
      + '<div style="position:absolute;left:150px;top:212px;width:140px;height:112px;pointer-events:none;opacity:0.4;background-image:linear-gradient(' + B + '26 1px,transparent 1px),linear-gradient(90deg,' + B + '26 1px,transparent 1px);background-size:22px 22px;-webkit-mask-image:radial-gradient(75% 75% at 60% 60%,#000 0%,rgba(0,0,0,0) 78%);mask-image:radial-gradient(75% 75% at 60% 60%,#000 0%,rgba(0,0,0,0) 78%)"></div>'
      + '<div style="position:absolute;left:-20%;top:-20%;right:-20%;bottom:-20%;pointer-events:none;background:linear-gradient(122deg,rgba(255,255,255,0) 34%,rgba(255,255,255,0.075) 50%,rgba(255,255,255,0) 63%)"></div>'
      + '<svg width="310" height="340" viewBox="0 0 310 340" style="position:absolute;left:0;top:0;pointer-events:none">'
      + '<circle cx="196" cy="118" r="1.5" fill="#FFFFFF" fill-opacity="0.45"></circle><circle cx="86" cy="206" r="1.2" fill="' + B + '" fill-opacity="0.7"></circle>'
      + '<circle cx="268" cy="176" r="1.1" fill="#FFFFFF" fill-opacity="0.3"></circle><circle cx="146" cy="66" r="1" fill="' + B + '" fill-opacity="0.6"></circle>'
      + '<rect x="6" y="6" width="298" height="328" rx="34" fill="none" stroke="#FFFFFF" stroke-width="13" stroke-opacity="0.05"></rect>'
      + '<rect x="6" y="6" width="298" height="328" rx="34" fill="none" stroke="#8FB0E8" stroke-width="5" stroke-opacity="0.16"></rect>'
      + '<rect x="6" y="6" width="298" height="328" rx="34" fill="none" stroke="' + CL + '" stroke-width="1.6" stroke-opacity="0.35"></rect>'
      + '<path d="M236 6 H270 A34 34 0 0 1 304 40 V86 L291 74 V29 H249 Z" fill="#070C1C" fill-opacity="0.9"></path>'
      + '<path d="M249 29 H291 V74" fill="none" stroke="' + CL + '" stroke-width="1.2" stroke-opacity="0.5"></path>'
      + '<path d="M254 13 l11 11 M267 13 l11 11 M280 15 l10 10" stroke="' + CL + '" stroke-width="2.2" stroke-opacity="0.85" stroke-linecap="round"></path>'
      + '<path d="M6 266 V300 A34 34 0 0 0 40 334 H86 L74 322 H31 V278 Z" fill="#070C1C" fill-opacity="0.85"></path>'
      + '<path d="M16 300 l12 12 M16 286 l26 26" stroke="' + CL + '" stroke-width="1.8" stroke-opacity="0.6" stroke-linecap="round"></path>'
      + '<path d="M286 318 l8 -8 M295 309 l6 -6" stroke="' + CL + '" stroke-width="1.8" stroke-opacity="0.7" stroke-linecap="round"></path>'
      + '<path d="M6 128 V40 A34 34 0 0 1 40 6 H132" fill="none" stroke="' + CL + '" stroke-width="4" stroke-linecap="round"' + G('7px ' + CL) + '></path>'
      + '<path d="M236 6 H270 A34 34 0 0 1 304 40 V86" fill="none" stroke="' + CL + '" stroke-width="2.6" stroke-linecap="round"' + G('5px ' + CL) + '></path>'
      + '<path d="M304 150 V214" fill="none" stroke="' + CL + '" stroke-width="3.4" stroke-linecap="round"' + G('7px ' + CL) + '></path>'
      + '<path d="M304 258 V300 A34 34 0 0 1 270 334 H244" fill="none" stroke="' + CL + '" stroke-width="1.8" stroke-opacity="0.4" stroke-linecap="round"></path>'
      + '<path d="M96 334 H40 A34 34 0 0 1 6 300 V268" fill="none" stroke="' + CL + '" stroke-width="2.6" stroke-opacity="0.55" stroke-linecap="round"></path>'
      + '<path d="M6 190 V236" fill="none" stroke="' + CL + '" stroke-width="1.6" stroke-opacity="0.3" stroke-linecap="round"></path>'
      + '<path d="M132 334 H186" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-opacity="0.9" stroke-linecap="round"' + G('6px #FFFFFF') + '></path>'
      + '<path d="M140 6 H186" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-opacity="0.85" stroke-linecap="round"></path>'
      + '<path d="M6 72 V104" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.45" stroke-linecap="round"></path>'
      + '<path d="M304 108 V138" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.35" stroke-linecap="round"></path>'
      + '<path d="M28 120 L39 129 H105 L116 120" fill="none" stroke="' + CL + '" stroke-width="2.2" stroke-opacity="0.9" stroke-linecap="round" stroke-linejoin="round"' + G('5px ' + CL) + '></path>'
      + '<path d="M50 133 H94" fill="none" stroke="' + CL + '" stroke-width="1" stroke-opacity="0.45" stroke-linecap="round"></path></svg>'
      + '<div style="position:absolute;left:28px;top:26px;width:88px;height:88px;background:url(' + logo + ') center/contain no-repeat;filter:drop-shadow(0 0 1.5px rgba(255,255,255,' + (br.dark ? '0.85' : '0.55') + ')) drop-shadow(0 0 9px ' + B + 'AA) drop-shadow(0 5px 5px ' + B + '59) drop-shadow(0 7px 8px rgba(0,0,0,0.8))"></div>'
      + '<div style="position:absolute;left:136px;top:60px;font-size:11.5px;font-weight:800;letter-spacing:0.3em;color:' + BL + ';white-space:nowrap;text-shadow:0 0 10px ' + B + '">' + br.cat + '</div>'
      + '<svg width="140" height="8" viewBox="0 0 140 8" style="position:absolute;left:136px;top:84px;pointer-events:none">'
      + '<path d="M2 7 L8 1 M11 7 L17 1 M20 7 L26 1 M29 7 L35 1" stroke="' + B + '" stroke-width="2.6" stroke-linecap="round"></path>'
      + '<path d="M42 4 H126" fill="none" stroke="' + B + '" stroke-width="1.4" stroke-opacity="0.45"></path>'
      + '<circle cx="133" cy="4" r="3.4" fill="' + B + '"' + G('4px ' + B) + '></circle></svg>'
      + '<div style="position:absolute;left:28px;top:134px;right:28px;font-size:30px;font-weight:800;color:#F4F7FF;letter-spacing:-0.035em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 10px rgba(0,0,0,0.6),0 0 14px ' + B + '33">' + x.name + '</div>'
      + '<div style="position:absolute;left:28px;top:188px;right:28px;font-size:14px;font-weight:600;color:' + BI + ';line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + x.desc + '</div>'
      + '<div style="position:absolute;left:28px;top:' + (270 - pf) + 'px;font-size:' + pf + 'px;font-weight:800;color:#FFFFFF;font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:-0.035em;line-height:1;text-shadow:0 3px 14px rgba(0,0,0,0.75)">' + priceText + '</div>'
      + '<div style="position:absolute;left:28px;top:284px;display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 16px;border-radius:999px;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + CB + ';background:linear-gradient(180deg,rgba(255,255,255,0.10) 0%,rgba(0,0,0,0.42) 100%),' + CL + '26;box-shadow:inset 0 1px 0 rgba(255,255,255,0.30),inset 0 0 0 1.5px ' + CL + 'B3,0 0 18px -6px ' + CL + '">' + (up ? '▲ ' : '▼ ') + Math.abs(x.change).toFixed(2) + '%</div>'
      + '<svg width="127" height="104" viewBox="0 0 127 104" style="position:absolute;left:155px;top:212px;pointer-events:none">'
      + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + CL + '" stop-opacity="0.42"></stop><stop offset="1" stop-color="' + CL + '" stop-opacity="0"></stop></linearGradient></defs>'
      + '<path d="M' + xy.join(' L ') + ' L ' + (W - PR) + ',' + H + ' L ' + PL + ',' + H + ' Z" fill="url(#' + gid + ')"></path>'
      + '<polyline points="' + xy.join(' ') + '" fill="none" stroke="' + CL + '" stroke-width="9" stroke-opacity="0.13" stroke-linejoin="round" stroke-linecap="round"></polyline>'
      + '<polyline points="' + xy.join(' ') + '" fill="none" stroke="' + CL + '" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"' + G('5px ' + CL) + '></polyline>'
      + '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="10" fill="' + CL + '" fill-opacity="0.24"></circle>'
      + '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4.2" fill="#FFFFFF"' + G('7px ' + CL) + '></circle></svg>'
      + '</div>';
  };

  // 카드 뒤에 까는 아우라 판 (밝은 배경용) — 카드보다 크게, 아주 옅게
  window.KW_AURA = function (x, u, scale) {
    var up = x.change >= 0, CL = up ? '#E8322E' : '#1668DC';
    var s = scale || 1.35;
    return 'position:absolute;left:50%;top:50%;width:' + Math.round(310 * s) + 'px;height:' + Math.round(340 * s) + 'px;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,' + CL + '2E 0%,' + CL + '14 45%,rgba(0,0,0,0) 78%)';
  };
})();
