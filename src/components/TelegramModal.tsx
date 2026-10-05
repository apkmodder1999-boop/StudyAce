import { useState } from "react";
import { Send, Check, Copy, ExternalLink, Sparkles, X, Users } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const TELEGRAM_CHANNEL_URL = "https://t.me/+7htXdqnvL0JiYjc1";

export function TelegramModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TELEGRAM_CHANNEL_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md overflow-hidden p-0 border border-sky-200 dark:border-sky-900 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">Join Study Ace Telegram Channel</DialogTitle>

        {/* Hero Decorative Top Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 px-6 pt-8 pb-7 text-white">
          {/* Subtle Ambient Shapes */}
          <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-sky-300/20 blur-lg pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-black/15 text-white/90 hover:bg-black/25 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Telegram Glowing Icon Avatar */}
            <div className="relative mb-3.5">
              <div className="absolute -inset-1.5 rounded-2xl bg-white/30 blur-md animate-pulse" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg text-sky-600">
                <Send className="h-8 w-8 translate-x-[-1px] translate-y-[-1px] fill-current" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-bold tracking-wide uppercase backdrop-blur-xs text-sky-100 mb-2 border border-white/20">
              <Sparkles className="h-3 w-3 text-sky-200" />
              <span>Official Community</span>
            </div>

            <h3 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Join Our Telegram Channel
            </h3>
            <p className="mt-1 text-xs text-sky-100 max-w-xs leading-relaxed">
              Stay updated with daily batch updates, new lecture alerts, handwritten notes, and
              DPPs!
            </p>
          </div>
        </div>

        {/* Perks & Actions Section */}
        <div className="p-6 space-y-4">
          <div className="grid gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-3 rounded-xl border border-sky-100 dark:border-slate-800 bg-sky-50/50 dark:bg-slate-800/50 p-2.5">
              <div className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-medium">Instant alerts when new lectures are uploaded</span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-sky-100 dark:border-slate-800 bg-sky-50/50 dark:bg-slate-800/50 p-2.5">
              <div className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Users className="h-4 w-4" />
              </div>
              <span className="font-medium">Connect with fellow JEE, NEET & GATE aspirants</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <a
              href={TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/25 transition hover:brightness-105 hover:shadow-lg hover:shadow-sky-500/35 active:scale-[0.99] cursor-pointer"
            >
              <Send className="h-4 w-4 fill-current" />
              <span>Join Channel Now</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80 ml-0.5" />
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Invite Link Copied!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy Channel Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Floating bottom-right trigger for quick community access */
export function TelegramFloatingButton({ onOpen }: { onOpen: () => void }) {
  return (
    <aside
      aria-label="Telegram Community"
      className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <button
        type="button"
        onClick={onOpen}
        className="group flex items-center gap-2 rounded-full border border-sky-400/40 bg-gradient-to-r from-sky-500 to-blue-600 pl-3 pr-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-500/30 transition hover:scale-105 hover:shadow-xl hover:shadow-sky-500/45 active:scale-95 cursor-pointer"
      >
        <div className="relative">
          <Send className="h-4 w-4 fill-current transition group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
        </div>
        <span className="hidden sm:inline">Join Telegram</span>
        <span className="sm:hidden">Telegram</span>
      </button>
    </aside>
  );
}
