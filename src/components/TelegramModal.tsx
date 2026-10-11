import { useState } from "react";
import { Send, Check, Copy, ExternalLink, X, Users, Bell } from "lucide-react";
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
      <DialogContent className="max-w-md overflow-hidden p-0 border border-border bg-card shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Join Physics Wallah (PW) Telegram Community</DialogTitle>

        {/* Header Section */}
        <div className="relative bg-muted/50 p-6 pb-5 border-b border-border">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Send className="h-6 w-6 -translate-x-0.5 translate-y-0.5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Join PW Community
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official PW updates, study materials & doubt discussions
              </p>
            </div>
          </div>
        </div>

        {/* Perks & Actions Section */}
        <div className="p-6 space-y-4">
          <div className="grid gap-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
              <div className="grid h-6 w-6 flex-none place-items-center rounded-md bg-primary/10 text-primary">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium text-foreground">
                Instant alerts when new batches and lectures are published
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
              <div className="grid h-6 w-6 flex-none place-items-center rounded-md bg-primary/10 text-primary">
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium text-foreground">
                Connect with thousands of students and share study material
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <a
              href={TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition active:scale-[0.99] cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 fill-current" />
              <span>Join Channel Now</span>
              <ExternalLink className="h-3 w-3 opacity-75 ml-0.5" />
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary font-bold">Invite Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
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
        className="group flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-md transition hover:scale-105 hover:border-primary/50 active:scale-95 cursor-pointer"
      >
        <Send className="h-3.5 w-3.5 text-primary" />
        <span>Community</span>
      </button>
    </aside>
  );
}
