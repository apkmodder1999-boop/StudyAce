import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Send, Moon, LayoutGrid, BookmarkCheck, Check } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useTheme } from "@/hooks/use-theme";
import { EnrollmentToast } from "@/components/EnrollmentToast";
import { UIColorPicker, UIColorPickerMobile } from "@/components/UIColorPicker";
import { useEnrollment } from "@/lib/enrollment-system";

export function Shell({ children }: { children: ReactNode }) {
  const { isDark, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { enrolledCount, isMounted } = useEnrollment();

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const currentSearch = routerState.location.search as { tab?: string };

  const isEnrolledActive = currentSearch.tab === "enrolled";
  const isAllBatchesActive =
    currentPath.startsWith("/batches") ||
    !currentSearch.tab ||
    currentSearch.tab === "all" ||
    currentSearch.tab === "batches";

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
      {/* PW GLOBAL SIDEBAR DRAWER */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isSidebarOpen
            ? "bg-slate-950/70 backdrop-blur-xs opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div
          className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-[300px] bg-card border-r border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out z-50 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* PROFILE / BRAND HEADER */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-lg shadow-xs">
                🎓
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground leading-tight">
                  Physics Wallah
                </h3>
                <span className="text-[11px] text-muted-foreground font-semibold">
                  Aspirant Portal
                </span>
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
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {/* Join Telegram (Direct Link) */}
            <a
              href="https://t.me/+7htXdqnvL0JiYjc1"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSidebarNav}
              className="w-full flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/30 p-3 text-left transition hover:scale-[1.01] cursor-pointer group shadow-2xs"
              title="Join Official Telegram"
            >
              <div className="flex items-center gap-2.5">
                <Send className="h-4 w-4 text-primary" />
                <span className="text-xs font-extrabold text-primary">Join Telegram Channel</span>
              </div>
              <span className="text-xs text-primary font-bold group-hover:translate-x-0.5 transition">
                &gt;
              </span>
            </a>

            {/* DIRECT NAVIGATION SECTION */}
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                Batches
              </div>

              {/* All Batches */}
              <Link
                to="/"
                search={{ tab: "all" }}
                onClick={handleSidebarNav}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                  isAllBatchesActive && !isEnrolledActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted hover:text-primary"
                }`}
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
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                  isEnrolledActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted hover:text-primary"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                  <span>My Enrolled Batches</span>
                </div>
                <span
                  suppressHydrationWarning
                  className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-mono font-bold"
                >
                  {isMounted ? enrolledCount : 0}
                </span>
              </Link>
            </div>

            {/* Dark Mode Switch */}
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
          </div>

          {/* SIDEBAR FOOTER */}
          <div className="p-4 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground">Physics Wallah</p>
            <p className="mt-0.5">Official Student Learning Portal</p>
          </div>
        </div>
      </div>

      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md text-foreground border-b border-border shadow-xs transition-colors">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3">
          {/* Left: Hamburger & Brand Name */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-foreground transition cursor-pointer"
              title="Open Menu"
              aria-label="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              to="/"
              search={{ tab: "all" }}
              className="flex items-center gap-2 hover:opacity-90 transition"
            >
              <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-xs shadow-xs">
                PW
              </div>
              <span className="font-black text-sm sm:text-base tracking-tight text-foreground hidden sm:inline">
                Physics Wallah
              </span>
            </Link>
          </div>

          {/* Right: Enrolled Count Pill, Telegram, & UI Color Picker */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/"
              search={{ tab: "enrolled" }}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 px-3 py-1 text-xs font-bold text-foreground transition border border-primary/20"
              title="View Enrolled Batches"
            >
              <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
              <span>My Batches</span>
              <span
                suppressHydrationWarning
                className="ml-0.5 rounded-full bg-primary text-primary-foreground px-1.5 py-0.2 text-[10px] font-mono font-black"
              >
                {isMounted ? enrolledCount : 0}
              </span>
            </Link>

            {/* Telegram Channel Shortcut */}
            <a
              href="https://t.me/+7htXdqnvL0JiYjc1"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition cursor-pointer"
              title="Join Telegram Channel"
            >
              <Send className="h-4 w-4" />
            </a>

            {/* UI Colour Selector Trigger */}
            <UIColorPicker />
          </div>
        </div>
      </header>

      {/* MAIN VIEW CONTENT */}
      <main className="mx-auto max-w-[1100px] px-3.5 sm:px-4 pt-3 sm:pt-4">{children}</main>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-card/98 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="mx-auto max-w-md flex items-center justify-around py-1.5 px-3">
          {/* Tab 1: All Batches */}
          <Link
            to="/"
            search={{ tab: "all" }}
            className={`flex flex-col items-center justify-center py-1 px-4 text-[11px] font-bold transition-all relative ${
              isAllBatchesActive && !isEnrolledActive
                ? "text-primary font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid
              className={`h-5 w-5 mb-0.5 ${isAllBatchesActive && !isEnrolledActive ? "stroke-[2.5]" : "stroke-[2]"}`}
            />
            <span>All Batches</span>
            {isAllBatchesActive && !isEnrolledActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </Link>

          {/* Tab 2: My Batches (Enrolled) */}
          <Link
            to="/"
            search={{ tab: "enrolled" }}
            className={`flex flex-col items-center justify-center py-1 px-4 text-[11px] font-bold transition-all relative ${
              isEnrolledActive
                ? "text-primary font-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookmarkCheck
              className={`h-5 w-5 mb-0.5 ${isEnrolledActive ? "stroke-[2.5]" : "stroke-[2]"}`}
            />
            <span>My Batches</span>
            {isEnrolledActive && (
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
