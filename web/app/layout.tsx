import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '키즈:키움',
  description: '게임으로 배우고, 부모님께 제안하는 자녀용 증권 앱',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f4b400',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-neutral-100 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
