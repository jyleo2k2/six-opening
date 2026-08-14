  setDraft(patch){ this.setState(s => Object.assign({}, s, { draft: Object.assign({}, s.draft, patch) })); }

