import { Link } from "@tanstack/react-router";
import { GraduationCap, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-sky-100 selection:text-sky-900">
      <header className="sticky top-0 z-30 border-b border-sky-100/80 bg-white/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5 transition">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-sm shadow-sky-500/25 transition group-hover:scale-105">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-primary transition">
                Study Ace
              </span>
              <span className="text-[10px] font-medium tracking-wide text-sky-600 -mt-0.5">
                Free Lectures & Notes
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
            >
              <span>All Batches</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">{children}</main>
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
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl truncate">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function Crumbs({ items }: { items: { label: string; to?: ReactNode }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      {items.map((item, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          {item.to ? (
            <span className="transition hover:text-sky-600">{item.to}</span>
          ) : (
            <span className="font-medium text-slate-900">{item.label}</span>
          )}
          {index < items.length - 1 && <span className="text-slate-300">/</span>}
        </span>
      ))}
    </nav>
  );
}

export function Loading({ text = "Loading content…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-sky-500 border-t-transparent shadow-sm" />
      <p className="mt-3.5 text-xs font-medium text-slate-500">{text}</p>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 text-center text-xs text-red-700 shadow-sm">
      <p className="font-bold text-sm text-red-800">Something went wrong</p>
      <p className="mt-1 text-red-600">{message}</p>
    </div>
  );
}

export function EmptyBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-12 text-center text-xs text-slate-500">
      <Sparkles className="mx-auto mb-2.5 h-6 w-6 text-sky-400 opacity-80" />
      <p className="font-semibold text-slate-700">{message}</p>
    </div>
  );
}
