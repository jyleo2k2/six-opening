  jumpCard(index){
    const card = this.railEl && this.railEl.children[index];
    if (card) card.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
  }
