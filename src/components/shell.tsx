import { Link } from "@tanstack/react-router";
import { GraduationCap, Sparkles, Moon, Sun, Send, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTheme } from "@/hooks/use-theme";
import { TelegramModal, TelegramFloatingButton } from "@/components/TelegramModal";
import { XPModal, XPEarnedToast } from "@/components/XPModal";
import { useXP } from "@/lib/xp-system";

export function Shell({ children }: { children: ReactNode }) {
  const { isDark, toggleTheme } = useTheme();
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isXpModalOpen, setIsXpModalOpen] = useState(false);
  const { totalXp, levelInfo, isMounted } = useXP();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-sky-100 selection:text-sky-900 dark:selection:bg-sky-900 dark:selection:text-sky-100 transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-sky-100/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5 transition">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-sm shadow-sky-500/25 transition group-hover:scale-105">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-primary transition">
                Study Ace
              </span>
              <span className="text-[10px] font-medium tracking-wide text-sky-600 dark:text-sky-400 -mt-0.5">
                Free Lectures & Notes
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2.5">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300"
            >
              <span>All Batches</span>
            </Link>

            {/* PW XP Gamified Pill */}
            <button
              type="button"
              onClick={() => setIsXpModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 sm:px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300 transition hover:bg-amber-100 dark:hover:bg-amber-900/60 hover:border-amber-300 cursor-pointer shadow-2xs"
              title="PW XP & Level Status (1 XP per 2 mins watched)"
              suppressHydrationWarning
            >
              <Zap className="h-3.5 w-3.5 fill-current text-amber-500 animate-pulse" />
              <span suppressHydrationWarning>{isMounted ? totalXp : 0} XP</span>
              <span
                suppressHydrationWarning
                className="hidden sm:inline font-bold text-[11px] text-amber-600 dark:text-amber-400"
              >
                · Lvl {isMounted ? levelInfo.level : 1}
              </span>
            </button>

            {/* Telegram Community Button */}
            <button
              type="button"
              onClick={() => setIsTelegramOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 transition hover:bg-sky-100 dark:hover:bg-sky-900/80 hover:border-sky-300 cursor-pointer shadow-2xs"
              title="Join Study Ace Telegram Channel"
            >
              <Send className="h-3.5 w-3.5 fill-current text-sky-500 dark:text-sky-400" />
              <span className="hidden sm:inline">Telegram</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-2xs"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              suppressHydrationWarning
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600 transition-transform duration-200 rotate-0 scale-100" />
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">{children}</main>

      {/* PW XP Profile & Level Status Modal */}
      <XPModal isOpen={isXpModalOpen} onClose={() => setIsXpModalOpen(false)} />

      {/* Real-Time Micro Toast when XP increases */}
      <XPEarnedToast />

      {/* Cool Telegram Channel Popup */}
      <TelegramModal isOpen={isTelegramOpen} onClose={() => setIsTelegramOpen(false)} />

      {/* Floating Bottom-Right Telegram Trigger */}
      <TelegramFloatingButton onOpen={() => setIsTelegramOpen(true)} />
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function Crumbs({ items }: { items: { label: string; to?: ReactNode }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      {items.map((item, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          {item.to ? (
            <span className="transition hover:text-sky-600 dark:hover:text-sky-400">{item.to}</span>
          ) : (
            <span className="font-medium text-slate-900 dark:text-slate-200">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <span className="text-slate-300 dark:text-slate-700">/</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Loading({ text = "Loading content…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-sky-500 border-t-transparent shadow-sm" />
      <p className="mt-3.5 text-xs font-medium text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/40 p-6 text-center text-xs text-red-700 dark:text-red-300 shadow-sm">
      <p className="font-bold text-sm text-red-800 dark:text-red-200">Something went wrong</p>
      <p className="mt-1 text-red-600 dark:text-red-400">{message}</p>
    </div>
  );
}

export function EmptyBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-sky-200 dark:border-slate-800 bg-sky-50/40 dark:bg-slate-900/40 p-12 text-center text-xs text-slate-500 dark:text-slate-400">
      <Sparkles className="mx-auto mb-2.5 h-6 w-6 text-sky-400 opacity-80" />
      <p className="font-semibold text-slate-700 dark:text-slate-300">{message}</p>
    </div>
  );
}
