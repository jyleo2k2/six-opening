  totalAsset(){
    // 계산은 shared/store/prototype-account.js 가 원본이다. React 로 옮긴 화면도 같은 함수를
    // 쓰므로 여기서 다시 세지 않는다. 화면은 현재가를 어디서 찾는지만 알려 준다.
    const stocks = this.uni().stocks || [];
    return accountTotalAsset(this.me(), code => {
      const st = stocks.filter(s => s.code === code)[0];
      return st ? st.price : 0;
    });
  }
