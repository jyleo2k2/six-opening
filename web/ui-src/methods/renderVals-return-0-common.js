    return {
      // 접수 실패는 주문 거절이다. 매수·매도 모두 완료 화면으로 넘어가지 않고 확인 단계에
      // 그대로 남는다 — 서버가 주문을 받지 못했는데 넣은 것처럼 보이면 안 된다.
      hasOrderError: !!s.orderError, orderErrorText: s.orderError || '',
      isBuy: s.screen === 'buy',
      isPortfolio: s.screen === 'portfolio',
      isBuy1: s.buyStep === 1, isBuy2: s.buyStep === 2, isBuy3: s.buyStep === 3,
      buyInProgress: s.buyStep < 3,
