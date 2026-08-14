  formatNewsDate(value){
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit'
    }).format(date);
  }

  // 로그인한 사람의 계정(부모/자녀)에서 한 행동만 서버에 남긴다.
