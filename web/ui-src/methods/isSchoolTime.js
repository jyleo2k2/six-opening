  isSchoolTime(){
    const f = this.state.forceSchool;
    if (f === 'on') return true;
    if (f === 'off') return false;
    const d = new Date(), day = d.getDay(), h = d.getHours() + d.getMinutes() / 60;
    // 기획안: 학교에 있는 오전 9시~오후 3시(장 운영시간)에는 자녀 매매 잠금
    return day >= 1 && day <= 5 && h >= 9 && h < 15;
  }
