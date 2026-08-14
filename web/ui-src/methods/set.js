  set(patch){ this.setState(s => { const n = Object.assign({}, s, patch); this.persist(n); return n; }); }
