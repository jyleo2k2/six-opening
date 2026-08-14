  stock(){ return this.uni().stocks.filter(s => s.code === this.state.code)[0] || null; }
