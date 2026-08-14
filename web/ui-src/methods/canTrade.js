  canTrade(){
    if (this.state.account === 'parent') return true;
    if (!this.state.schoolLock) return true;
    return !this.isSchoolTime();
  }
