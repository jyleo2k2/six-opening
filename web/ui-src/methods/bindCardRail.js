  bindCardRail(el){
    if (!el || el === this.railEl) return;
    this.railEl = el;
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

  /**
   * 성장 아카이브 화면에 필요한 값을 한 번에 만든다.
   *
   * 가족은 기획안대로 아빠·엄마·찬영 셋이다. 지금 앱에는 자녀(찬영)와 부모(엄마)
   * 계정만 있어서 아빠 칸은 비어 있다. 계정이 생기면 ACC 에 한 줄 추가하면 된다.
   */
