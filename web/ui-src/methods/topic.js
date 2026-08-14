  topic(name){
    const ch = name.charCodeAt(name.length - 1);
    if (ch >= 0xAC00 && ch <= 0xD7A3) return ((ch - 0xAC00) % 28) !== 0 ? '은' : '는';
    return '는';
  }
