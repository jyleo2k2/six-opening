"use client";

import Link from "next/link";
import Image from "next/image";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  return <button className={`min-h-12 w-full rounded-xl px-5 text-[15px] font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${variant === "primary" ? "bg-magenta text-white" : "border border-navy bg-white text-navy"} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl bg-white p-4 shadow-card ${className}`} {...props} />;
}

export function Chip({ selected, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return <button className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${selected ? "border-magenta bg-magenta text-white" : "border-gray bg-white text-ink"} ${className}`} {...props} />;
}

export function PriceText({ value, rate, compact = false }: { value?: number; rate: number; compact?: boolean }) {
  const rising = rate >= 0;
  return (
    <span className={`${rising ? "text-up" : "text-down"} font-bold tabular-nums`}>
      {rising ? "▲" : "▼"} {value !== undefined ? `${Math.abs(value).toLocaleString()} ` : ""}({Math.abs(rate).toFixed(2)}%)
      {!compact && <span className="sr-only"> {rising ? "상승" : "하락"}</span>}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-gray"><div className="h-full rounded-full bg-magenta" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
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

export function CoachAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-navy font-extrabold text-white ${size === "sm" ? "h-9 w-9 text-[10px]" : "h-14 w-14 text-xs"}`}>키웅이</span>;
}

export function SpeechBubble({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-white p-3 text-sm text-ink shadow-card">{children}</div>;
}

export function ChatComposer() {
  return <div className="flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-gray px-3 text-sm" placeholder="키웅이에게 물어보기" /><button className="rounded-xl bg-navy px-4 text-sm font-bold text-white">보내기</button></div>;
}

const confidenceOptions = [
  { value: 25 as const, emoji: "😕", label: "잘 모르겠어" },
  { value: 50 as const, emoji: "🙂", label: "조금" },
  { value: 75 as const, emoji: "😄", label: "꽤" },
  { value: 100 as const, emoji: "🤩", label: "완전" },
];

export function ConfidenceSelector({ value, onChange }: { value?: 25 | 50 | 75 | 100; onChange: (value: 25 | 50 | 75 | 100) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold">키웅이가 궁금해! 이 생각에 얼마나 자신 있어?</p>
      <div className="grid grid-cols-4 gap-2">
        {confidenceOptions.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`rounded-xl border p-2 text-center ${value === option.value ? "border-magenta bg-magenta text-white" : "border-gray bg-white text-ink"}`}><span className="block text-xl">{option.emoji}</span><span className="mt-1 block text-[10px] font-semibold">{option.label}</span></button>)}
      </div>
      <p className="mt-2 text-center text-xs text-ink opacity-60">정답은 없어!</p>
    </div>
  );
}

export function ConfettiBurst() {
  return <div className="confetti" aria-hidden="true"><span>★</span><span>●</span><span>◆</span><span>★</span><span>●</span></div>;
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

export function LoadingScreen({ loaded, total, message = "실시간 시세를 불러오고 있어" }: { loaded: number; total: number; message?: string }) {
  const progress = total ? loaded / total * 100 : 100;
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-10 text-center" role="status" aria-live="polite">
      <div className="loading-character">
        <Image src="/영웅이_인사_1024.png" alt="손을 흔드는 영웅이" width={220} height={220} priority className="h-52 w-52 object-contain" />
      </div>
      <h1 className="mt-6 text-xl font-extrabold">{message}</h1>
      <p className="mt-2 text-sm opacity-60">가격을 모두 확인한 뒤 한 번에 보여줄게!</p>
      <div className="mt-7 w-full"><ProgressBar value={progress} /></div>
      <p className="mt-3 text-xs font-bold tabular-nums opacity-60">{loaded} / {total}</p>
    </div>
  );
}
