"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/**
 * 디자인시스템 §6 공용 컴포넌트. 토큰은 `app/globals.css`의 `@theme`가 소유한다.
 *
 * mock-stock에서 옮겨오며 소비자가 있는 5종만 남겼다. Chip·PriceText·ProgressBar·
 * CoachAvatar·SpeechBubble·ChatComposer·ConfidenceSelector·ConfettiBurst·LoadingScreen은
 * 함께 삭제된 mock 화면 전용이었다 — 필요해지면 커밋 이력에서 되살린다.
 */

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  return <button className={`min-h-12 w-full rounded-xl px-5 text-[15px] font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${variant === "primary" ? "bg-magenta text-white" : "border border-navy bg-white text-navy"} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl bg-white p-4 shadow-card ${className}`} {...props} />;
}

export function TabBar({ active = "portfolio" }: { active?: "portfolio" | "records" | "learn" }) {
  const items = [
    { key: "portfolio", label: "포트폴리오", icon: "⌂", href: "/" },
    { key: "records", label: "투자 기록", icon: "▤", href: "/" },
    { key: "learn", label: "배우기", icon: "◇", href: "/" },
  ];
  return (
    <nav className="sticky bottom-0 z-20 mt-auto grid grid-cols-3 border-t border-gray bg-white px-3 py-2" aria-label="하단 메뉴">
      {items.map((item) => <Link key={item.key} href={item.href} className={`flex flex-col items-center gap-1 py-1 text-[10px] font-bold ${active === item.key ? "text-magenta" : "text-ink opacity-60"}`}><span className="text-xl">{item.icon}</span>{item.label}</Link>)}
    </nav>
  );
}

export function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[78px] items-end justify-between bg-navy px-5 pb-4 text-white">
      <div className="flex items-center gap-3">{onBack && <button onClick={onBack} aria-label="뒤로 가기" className="text-3xl leading-none">‹</button>}<h1 className="text-xl font-bold">{title}</h1></div>
      {right}
    </header>
  );
}

export function PhoneShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-bg text-ink shadow-card">{children}</main>;
}
