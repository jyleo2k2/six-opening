  polyline(pts, w, h){
    if (!pts || !pts.length) return '';
    return pts.map((v,i) => (i*(w/(pts.length-1))).toFixed(1) + ',' + (h - v/100*h).toFixed(1)).join(' ');
  }
