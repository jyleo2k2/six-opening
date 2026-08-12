import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "키움 가족 모의투자 리그",
  description: "부모와 자녀가 함께 투자 행동을 돌아보는 모의투자 데모",
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

