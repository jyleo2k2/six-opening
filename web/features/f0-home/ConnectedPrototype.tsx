"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  F10ChatbotDemo,
  type F10ScreenContext,
} from "../f10-chatbot/F10ChatbotDemo";

type PrototypeScreen =
  | "home"
  | "explore"
  | "detail"
  | "buy"
  | "sell"
  | "done"
  | "portfolio"
  | "archive"
  | "ranking"
  | "chart"
  | "news";

type PrototypeContextMessage = {
  source: "kiwoom-prototype";
  type: "context";
  screen: PrototypeScreen;
  stock: {
    id: `KRX:${string}`;
    name: string;
    unitPrice: number;
  } | null;
};

const SCREEN_MAP: Record<PrototypeScreen, F10ScreenContext["screen"]> = {
  home: "home",
  explore: "stock",
  detail: "stock",
  buy: "order",
  sell: "order",
  done: "order",
  portfolio: "home",
  archive: "archive",
  ranking: "home",
  chart: "stock",
  news: "stock",
};

function isPrototypeContextMessage(value: unknown): value is PrototypeContextMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<PrototypeContextMessage>;
  return (
    message.source === "kiwoom-prototype" &&
    message.type === "context" &&
    typeof message.screen === "string" &&
    message.screen in SCREEN_MAP
  );
}

export function ConnectedPrototype() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [prototypeContext, setPrototypeContext] = useState<PrototypeContextMessage>({
    source: "kiwoom-prototype",
    type: "context",
    screen: "home",
    stock: null,
  });

  useEffect(() => {
    function receiveContext(event: MessageEvent<unknown>) {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow ||
        !isPrototypeContextMessage(event.data)
      ) {
        return;
      }
      setPrototypeContext(event.data);
    }

    window.addEventListener("message", receiveContext);
    return () => window.removeEventListener("message", receiveContext);
  }, []);

  const chatContext = useMemo<F10ScreenContext>(
    () => ({
      screen: SCREEN_MAP[prototypeContext.screen],
      ...(prototypeContext.stock
        ? {
            stockId: prototypeContext.stock.id,
            stockName: prototypeContext.stock.name,
            unitPrice: prototypeContext.stock.unitPrice,
          }
        : {}),
    }),
    [prototypeContext],
  );

  function navigatePrototype(target: F10ScreenContext["screen"]) {
    frameRef.current?.contentWindow?.postMessage(
      { source: "kiwoom-shell", type: "navigate", target },
      window.location.origin,
    );
  }

  return (
    <main className="h-dvh min-h-[640px] overflow-hidden bg-bg text-ink">
      <iframe
        className="block h-full w-full border-0"
        ref={frameRef}
        src="/ui/app.html?runtime=1"
        title="키움 가족 모의투자 리그"
      />
      <F10ChatbotDemo
        context={chatContext}
        embedded
        onNavigate={navigatePrototype}
      />
    </main>
  );
}
