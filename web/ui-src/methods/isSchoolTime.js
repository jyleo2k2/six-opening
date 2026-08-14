  isSchoolTime(){
    const f = this.state.forceSchool;
    if (f === 'on') return true;
    if (f === 'off') return false;
    const d = new Date(), day = d.getDay(), h = d.getHours() + d.getMinutes() / 60;
    // 한국거래소 정규장(09:00~15:30)에는 자녀 매매 잠금
    return day >= 1 && day <= 5 && h >= 9 && h < 15.5;
  }
