  judgePlanMatch(buyRec, price){
    if (!buyRec) return null;
    const days = Math.floor((Date.now() - new Date(buyRec.ts).getTime()) / 86400000);
    switch (buyRec.plan_code) {
      case 'plan_short':  return days <= SHORT_TERM_DAYS;
      case 'plan_season': return false;
      case 'plan_target': return buyRec.plan_target_price ? price >= buyRec.plan_target_price : false;
      default: return null;
    }
  }
