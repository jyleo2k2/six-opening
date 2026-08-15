  componentWillUnmount(){
    if (this.liveRefreshTimer) clearInterval(this.liveRefreshTimer);
    if (this.receiveNavigation) window.removeEventListener('message', this.receiveNavigation);
  }
