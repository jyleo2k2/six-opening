"use client";

import { F10ChatbotDemo } from "../f10-chatbot/F10ChatbotDemo";

export function ConnectedPrototype() {
  return (
    <div className="h-dvh min-h-[640px] overflow-hidden bg-bg text-ink">
      <iframe
        className="block h-full w-full border-0"
        src="/ui/app.html?runtime=1"
        title="키움 가족 모의투자 리그"
      />
      <div className="prototype-chat-overlay">
        <F10ChatbotDemo />
      </div>
    </div>
  );
}
