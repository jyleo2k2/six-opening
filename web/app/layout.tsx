import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiwoong Chatbot Demo",
  description: "Kiwoong family mock-investment chatbot demo",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

