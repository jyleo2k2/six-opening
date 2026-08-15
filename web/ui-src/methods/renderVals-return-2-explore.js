
      // 탐색 화면은 React(`ExploreScreen`)로 옮겨 갔다. 여기 남은 값은 매수·매도 화면이
      // 함께 쓰는 종목 표기뿐이다.
      stockName: st ? st.name : '', stockEmoji: st && !logos[st.code] ? (sec.name || '').charAt(0) : '',
      stockPriceText: st ? st.price.toLocaleString('ko-KR') + '원' : '',
      stockChangeText: st ? ((st.change >= 0 ? '▲ ' : '▼ ') + Math.abs(st.change).toFixed(2) + '%') : '',
      detailChangeStyleSm: 'font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (st && st.change >= 0 ? up : down),
      detailBadgeStyle: bigBadge(52, 18, 25) + (st && logos[st.code]
        ? ';background-color:#F4F4FA;background-image:url(' + logos[st.code] + ');background-position:center;background-size:contain;background-repeat:no-repeat'
        : ''),
      miniBadgeStyle: bigBadge(38, 13, 18),
