import { Link } from "@tanstack/react-router";
import {
  Moon,
  Sun,
  Send,
  Zap,
  BookmarkCheck,
  Menu,
  X,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTheme } from "@/hooks/use-theme";
import { TelegramModal, TelegramFloatingButton } from "@/components/TelegramModal";
import { XPModal, XPEarnedToast } from "@/components/XPModal";
import { EnrollmentToast } from "@/components/EnrollmentToast";
import { useXP } from "@/lib/xp-system";
import { useEnrollment } from "@/lib/enrollment-system";

export function Shell({ children }: { children: ReactNode }) {
  const { isDark, toggleTheme } = useTheme();
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isXpModalOpen, setIsXpModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { totalXp, levelInfo, isMounted } = useXP();
  const { enrolledCount } = useEnrollment();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary transition-colors duration-200">
      {/* PW GLOBAL SIDEBAR DRAWER (MATCHING USER TEMPLATE) */}
      <div
        className={`fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div
          className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-card border-r border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* SIDEBAR HEADER */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsPPJTx84nqujONE6xGDPWGjwhuKiN6-RoEl7hn5PmSg&s"
                  alt="PW Student Avatar"
                  className="h-10 w-10 rounded-full object-cover border-2 border-white/30 shadow-md bg-slate-800"
                  onError={(e) => {
                    e.currentTarget.src = "https://learntopper.in/pdablooo.jpg";
                  }}
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  Physics Wallah Student
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">Free Access Portal</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* SIDEBAR BODY */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div>
              <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Academics & Study
              </div>
              <div className="space-y-1">
                <Link
                  to="/"
                  search={{ tab: "all" }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition"
                >
                  <span className="text-base">📚</span>
                  <span>All Batches</span>
                </Link>

                <Link
                  to="/"
                  search={{ tab: "enrolled" }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">📖</span>
                    <span>My Batches</span>
                  </div>
                  <span
                    suppressHydrationWarning
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono tabular-nums"
                  >
                    {isMounted ? enrolledCount : 0}
                  </span>
                </Link>
              </div>
            </div>

            <div>
              <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Features & Gamification
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsXpModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">⚡</span>
                    <span>XP & Level Status</span>
                  </div>
                  <span
                    suppressHydrationWarning
                    className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500 font-mono tabular-nums"
                  >
                    {isMounted ? totalXp : 0} XP
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsTelegramOpen(true);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition cursor-pointer text-left"
                >
                  <span className="text-base">✈️</span>
                  <span>PW Community (Telegram)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{isDark ? "☀️" : "🌙"}</span>
                    <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {isDark ? "Active" : "Active"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* SIDEBAR FOOTER */}
          <div className="p-4 bg-muted/40 border-t border-border">
            <div className="flex items-center gap-2.5">
              <img
                src="https://learntopper.in/pdablooo.jpg"
                alt="PW Logo"
                className="h-6 w-6 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span className="text-xs font-bold text-foreground">Trusted Platform</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Physics Wallah · Padhai Ab Sabke Liye
            </p>
          </div>
        </div>
      </div>

      {/* TOP HEADER (MATCHING USER SCREENSHOT) */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="h-[38px] w-[38px] rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition cursor-pointer shadow-2xs"
              title="Open Menu"
              aria-label="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* PW Brand Badge (exact styling from template) */}
            <Link
              to="/"
              search={{ tab: "all" }}
              className="flex items-center gap-2 rounded-full border border-border bg-[#f8fafc] dark:bg-slate-900 py-1 pl-1.5 pr-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <img
                className="h-[28px] w-[28px] rounded-full object-contain bg-white border border-white shadow-2xs"
                src="https://learntopper.in/pdablooo.jpg"
                alt="PW Logo"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-[14px] sm:text-[15px] font-extrabold text-foreground tracking-tight">
                  Physics Wallah
                </span>
                <span
                  className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2563eb] text-white text-[9px] font-black"
                  title="Official PW Portal"
                >
                  ✓
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              search={{ tab: "all" }}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <span>Batches</span>
            </Link>

            {/* My Batches Link */}
            <Link
              to="/"
              search={{ tab: "enrolled" }}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 text-xs font-bold text-[#2563eb] dark:text-blue-400 hover:bg-blue-100 transition cursor-pointer"
              title="View your enrolled study batches"
            >
              <BookmarkCheck className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">My Batches</span>
              <span
                suppressHydrationWarning
                className="rounded-full bg-[#2563eb] text-white px-1.5 py-0.2 text-[10px] font-mono tabular-nums font-bold"
              >
                {isMounted ? enrolledCount : 0}
              </span>
            </Link>

            {/* PW XP Gamified Button */}
            <button
              type="button"
              onClick={() => setIsXpModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer shadow-2xs"
              title="PW XP & Level Status"
              suppressHydrationWarning
            >
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span suppressHydrationWarning className="font-mono tabular-nums">
                {isMounted ? totalXp : 0} XP
              </span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-[34px] w-[34px] place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer shadow-2xs"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              suppressHydrationWarning
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN VIEW WRAPPER */}
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5">{children}</main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card py-8 text-xs text-muted-foreground">
        <div className="mx-auto max-w-[1100px] px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <img
              src="https://learntopper.in/pdablooo.jpg"
              alt="PW Logo"
              className="h-6 w-6 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="font-extrabold text-foreground tracking-tight">PHYSICS WALLAH</span>
            <span>·</span>
            <span className="font-medium">Trusted Platform · Padhai Ab Sabke Liye</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Complete Free Access to Video Lectures, Chapter Notes & DPPs.
          </p>
        </div>
      </footer>

      {/* PW XP Profile & Level Status Modal */}
      <XPModal isOpen={isXpModalOpen} onClose={() => setIsXpModalOpen(false)} />

      {/* Real-Time Micro Toast when XP increases */}
      <XPEarnedToast />

      {/* Real-Time Micro Toast when Batch Enrolled / Unenrolled */}
      <EnrollmentToast />

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
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl truncate">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function Crumbs({ items }: { items: { label: string; to?: ReactNode }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          {item.to ? (
            <span className="transition hover:text-foreground">{item.to}</span>
          ) : (
            <span className="font-semibold text-foreground">{item.label}</span>
          )}
          {index < items.length - 1 && <span className="text-border">/</span>}
        </span>
      ))}
    </nav>
  );
}

export function Loading({ text = "Loading content…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent shadow-xs" />
      <p className="mt-3.5 text-xs font-semibold text-muted-foreground">{text}</p>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-xs text-destructive">
      <p className="font-bold text-sm">Something went wrong</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </div>
  );
}

export function EmptyBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">{message}</p>
    </div>
  );
}
