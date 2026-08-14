  snapCard(index){
    const card = this.railEl && this.railEl.children[index];
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  /**
   * 성장 아카이브 화면에 필요한 값을 한 번에 만든다.
   *
   * 가족은 기획안대로 아빠·엄마·찬영 셋이다. 지금 앱에는 자녀(찬영)와 부모(엄마)
   * 계정만 있어서 아빠 칸은 비어 있다. 계정이 생기면 ACC 에 한 줄 추가하면 된다.
   */
