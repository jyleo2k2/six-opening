  setSell(patch){ this.setState(s => Object.assign({}, s, { sellDraft: Object.assign({}, s.sellDraft, patch) })); }
