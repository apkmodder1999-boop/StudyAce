import { Link, useRouterState } from "@tanstack/react-router";
import {
  Menu,
  X,
  Gift,
  Flame,
  Bell,
  Send,
  Moon,
  Users,
  Info,
  PhoneCall,
  LogOut,
  BookOpen,
  LayoutGrid,
  BookmarkCheck,
  Zap,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useTheme } from "@/hooks/use-theme";
import { XPModal, XPEarnedToast } from "@/components/XPModal";
import { EnrollmentToast } from "@/components/EnrollmentToast";
import { UIColorPicker, UIColorPickerMobile } from "@/components/UIColorPicker";
import { useXP } from "@/lib/xp-system";
import { useEnrollment } from "@/lib/enrollment-system";
import { PWModal, type ModalType } from "@/components/PWModals";

export function Shell({ children }: { children: ReactNode }) {
  const { isDark, toggleTheme } = useTheme();
  const [isXpModalOpen, setIsXpModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const { totalXp, streakDays, isMounted } = useXP();
  const { enrolledCount } = useEnrollment();

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const currentSearch = routerState.location.search as { tab?: string };

  const isBatchesActive =
    currentPath.startsWith("/batches") ||
    currentSearch.tab === "batches" ||
    currentSearch.tab === "all";
  const isStudyActive =
    (currentPath === "/" && !currentSearch.tab) ||
    currentSearch.tab === "study" ||
    currentSearch.tab === "enrolled";

  // Prevent body scrolling when sidebar drawer is open & handle Escape key
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  const handleSidebarNav = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary transition-colors duration-200 pb-20">
      {/* PW GLOBAL SIDEBAR DRAWER (REFINED & FULLY FUNCTIONAL) */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isSidebarOpen
            ? "bg-slate-950/70 backdrop-blur-xs opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div
          className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-card border-r border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out z-50 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* PROFILE HEADER */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center text-xl shadow-xs">
                🎓
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground leading-tight">
                  Hi, Aspirant
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    handleSidebarNav();
                    setTimeout(() => setActiveModal("profile"), 150);
                  }}
                  className="text-xs text-primary hover:underline transition cursor-pointer font-semibold"
                >
                  View profile
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* SIDEBAR BODY ITEMS */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {/* Join Telegram ✨ (Direct Link) */}
            <a
              href="https://t.me/+7htXdqnvL0JiYjc1"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSidebarNav}
              className="w-full flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/30 p-3 text-left transition hover:scale-[1.01] cursor-pointer group shadow-2xs"
              title="Join Official Telegram"
            >
              <div className="flex items-center gap-2.5">
                <Send className="h-4 w-4 text-primary" />
                <span className="text-xs font-extrabold text-primary">Join Telegram ✨</span>
              </div>
              <span className="text-xs text-primary font-bold group-hover:translate-x-0.5 transition">
                &gt;
              </span>
            </a>

            {/* DIRECT NAVIGATION SECTION */}
            <div className="space-y-1 pt-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                Navigation
              </div>

              {/* Study Zone */}
              <Link
                to="/"
                search={{ tab: "study" }}
                onClick={handleSidebarNav}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>Study Zone</span>
                </div>
                <span className="text-[10px] text-muted-foreground">&gt;</span>
              </Link>

              {/* All Batches */}
              <Link
                to="/"
                search={{ tab: "batches" }}
                onClick={handleSidebarNav}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  <span>All Batches</span>
                </div>
                <span className="text-[10px] text-muted-foreground">&gt;</span>
              </Link>

              {/* My Enrolled Batches */}
              <Link
                to="/"
                search={{ tab: "enrolled" }}
                onClick={handleSidebarNav}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition"
              >
                <div className="flex items-center gap-2.5">
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                  <span>My Enrolled Batches</span>
                </div>
                <span
                  suppressHydrationWarning
                  className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-mono font-bold"
                >
                  {isMounted ? enrolledCount : 0}
                </span>
              </Link>

              {/* XP Status */}
              <button
                type="button"
                onClick={() => {
                  handleSidebarNav();
                  setTimeout(() => setIsXpModalOpen(true), 150);
                }}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>XP & Level Status</span>
                </div>
                <span
                  suppressHydrationWarning
                  className="rounded-full bg-amber-500/15 text-amber-500 px-2 py-0.5 text-[10px] font-mono font-bold"
                >
                  {isMounted ? totalXp : 0} XP
                </span>
              </button>
            </div>

            {/* Dark Mode Switch (Clickable Row) */}
            <div
              onClick={toggleTheme}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted cursor-pointer transition select-none border border-border/60"
            >
              <div className="flex items-center gap-3">
                <Moon className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Dark Mode</span>
              </div>
              <div
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isDark ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isDark ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </div>

            {/* Appearance & Colour Section */}
            <div className="pt-1 pb-1 px-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
                Theme Colour
              </div>
              <UIColorPickerMobile />
            </div>

            {/* Support & Community Links */}
            <div className="space-y-0.5 border-t border-border/80 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  handleSidebarNav();
                  setTimeout(() => setActiveModal("refer"), 150);
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition text-left cursor-pointer font-semibold"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Refer & Share</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSidebarNav();
                  setTimeout(() => setActiveModal("about"), 150);
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition text-left cursor-pointer font-semibold"
              >
                <Info className="h-4 w-4 text-muted-foreground" />
                <span>About Us</span>
              </button>

              <a
                href="https://t.me/+7htXdqnvL0JiYjc1"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleSidebarNav}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition text-left cursor-pointer font-semibold"
              >
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
                <span>Help & Support</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  handleSidebarNav();
                  setTimeout(() => setActiveModal("profile"), 150);
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-rose-500 hover:bg-rose-500/10 transition text-left cursor-pointer font-semibold mt-1"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* SIDEBAR FOOTER */}
          <div className="p-4 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground">Physics Wallah</p>
            <p className="mt-0.5">App Version: 1.0.0 · Made with ❤️ in India</p>
          </div>
        </div>
      </div>

      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 bg-[#13122b] text-white border-b border-white/10 shadow-md">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3">
          {/* Left: Hamburger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="h-9 w-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition cursor-pointer"
              title="Open Menu"
              aria-label="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Right Icons: Gift, Streak, XP, Bell, UI Color Circle */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* 🎁 Gift / Rewards */}
            <button
              type="button"
              onClick={() => setActiveModal("rewards")}
              className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-amber-400 transition cursor-pointer"
              title="PW Rewards & Daily Study Perks"
            >
              <Gift className="h-4 w-4" />
            </button>

            {/* 🔥 Streak Flame Counter */}
            <button
              type="button"
              onClick={() => setIsXpModalOpen(true)}
              className="flex items-center gap-1 text-white hover:text-amber-400 transition cursor-pointer text-xs font-bold font-mono"
              title="Study Streak Days"
              suppressHydrationWarning
            >
              <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>{isMounted ? streakDays : 0}</span>
            </button>

            {/* XP Badge Pill */}
            <button
              type="button"
              onClick={() => setIsXpModalOpen(true)}
              className="rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-0.5 text-[11px] font-bold font-mono text-white transition cursor-pointer flex items-center gap-1 border border-white/10"
              title="Student XP & Level"
              suppressHydrationWarning
            >
              <span className="text-[10px] text-amber-400">XP</span>
              <span>{isMounted ? totalXp : 0}</span>
            </button>

            {/* 🔔 Notification Bell */}
            <button
              type="button"
              onClick={() => setActiveModal("notices")}
              className="relative h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition cursor-pointer"
              title="Notices & Announcements"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#13122b]" />
            </button>

            {/* 🎨 UI Colour Selector Trigger (Top-Right Circle) */}
            <UIColorPicker />
          </div>
        </div>
      </header>

      {/* MAIN VIEW CONTENT */}
      <main className="mx-auto max-w-[1100px] px-3.5 sm:px-4 pt-3 sm:pt-4">{children}</main>

      {/* FIXED BOTTOM NAVIGATION BAR (CLEAN 3-TAB LAYOUT) */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-card/98 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="mx-auto max-w-md flex items-center justify-around py-1.5 px-3">
          {/* Tab 1: Study */}
          <Link
            to="/"
            search={{ tab: "study" }}
            className={`flex flex-col items-center justify-center py-1 px-4 text-[11px] font-bold transition-all relative ${
              isStudyActive
                ? "text-primary font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen
              className={`h-5 w-5 mb-0.5 ${isStudyActive ? "stroke-[2.5]" : "stroke-[2]"}`}
            />
            <span>Study</span>
            {isStudyActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </Link>

          {/* Tab 2: Batches */}
          <Link
            to="/"
            search={{ tab: "batches" }}
            className={`flex flex-col items-center justify-center py-1 px-4 text-[11px] font-bold transition-all relative ${
              isBatchesActive && !isStudyActive
                ? "text-primary font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid
              className={`h-5 w-5 mb-0.5 ${isBatchesActive && !isStudyActive ? "stroke-[2.5]" : "stroke-[2]"}`}
            />
            <span>Batches</span>
            {isBatchesActive && !isStudyActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </Link>

          {/* Tab 3: Community (Telegram) */}
          <a
            href="https://t.me/+7htXdqnvL0JiYjc1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-1 px-4 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <Send className="h-5 w-5 mb-0.5 stroke-[2]" />
            <span>Community</span>
          </a>
        </div>
      </nav>

      {/* PW Custom Modals */}
      <PWModal type={activeModal} onClose={() => setActiveModal(null)} />

      {/* PW XP Profile & Level Status Modal */}
      <XPModal isOpen={isXpModalOpen} onClose={() => setIsXpModalOpen(false)} />

      {/* Real-Time Micro Toast when XP increases */}
      <XPEarnedToast />

      {/* Real-Time Micro Toast when Batch Enrolled / Unenrolled */}
      <EnrollmentToast />
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
    <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function Crumbs({ items }: { items: { label: string; to?: ReactNode }[] }) {
  return (
    <nav className="mb-3.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
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
