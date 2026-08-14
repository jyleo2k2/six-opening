  notifyChatBehavior(event){
    if (window.parent === window) return;
    window.parent.postMessage({ type:'kiwoom:chat-behavior', event:event }, window.location.origin);
  }
