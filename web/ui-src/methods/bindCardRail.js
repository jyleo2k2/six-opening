  bindCardRail(el){
    if (!el || el === this.railEl) return;
    this.railEl = el;
    // 카드 모아보기를 여는 순간 이 콜백이 레일 DOM 과 함께 바로 실행된다. openCards()
    // 의 jumpCard() 호출은 이 레일이 아직 없을 때 일어날 수 있어 여기서도 한 번 더
    // 현재 카드로 맞춘다. 다시 열 때(레일이 새로 생길 때)도 이 분기를 함께 탄다.
    if (this.state.cardActive !== undefined && this.state.cardActive !== null) {
      this.jumpCard(this.state.cardActive);
    }
    el.addEventListener('scroll', () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0, bd = 1e9;
      for (let i = 0; i < el.children.length; i++) {
        const k = el.children[i], d = Math.abs(k.offsetLeft + k.offsetWidth/2 - mid);
        if (d < bd) { bd = d; best = i; }
      }
      if (best !== this.state.cardActive) this.setState({ cardActive: best });
    }, { passive: true });
  }
