import { X, Bell, Gift, User, Clock, Bookmark, Users, Info } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";

export type ModalType =
  "notices" | "rewards" | "profile" | "history" | "bookmarks" | "refer" | "about" | null;

interface PWModalProps {
  type: ModalType;
  onClose: () => void;
}

export function PWModal({ type, onClose }: PWModalProps) {
  if (!type) return null;

  return (
    <Dialog open={!!type} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 border border-primary/20 bg-card shadow-2xl rounded-2xl overflow-hidden z-[100]">
        <DialogTitle className="sr-only">Physics Wallah</DialogTitle>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-[#13122b] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {type === "notices" && <Bell className="h-5 w-5 text-amber-400" />}
            {type === "rewards" && <Gift className="h-5 w-5 text-amber-400" />}
            {type === "profile" && <User className="h-5 w-5 text-primary" />}
            {type === "history" && <Clock className="h-5 w-5 text-indigo-400" />}
            {type === "bookmarks" && <Bookmark className="h-5 w-5 text-rose-400" />}
            {type === "refer" && <Users className="h-5 w-5 text-primary" />}
            {type === "about" && <Info className="h-5 w-5 text-primary" />}

            <h3 className="text-sm sm:text-base font-bold text-white capitalize">
              {type === "notices" && "Notices & Announcements"}
              {type === "rewards" && "PW Rewards & Perks"}
              {type === "profile" && "Student Profile"}
              {type === "history" && "Watch History & Activity"}
              {type === "bookmarks" && "Saved Lectures & Notes"}
              {type === "refer" && "Refer & Share"}
              {type === "about" && "About Physics Wallah Portal"}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {type === "notices" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">🔴 LIVE SESSION UPDATE</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Today</span>
                </div>
                <h4 className="text-xs font-bold text-foreground">
                  New JEE & NEET Daily Practice Problems Uploaded
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  High-yield DPP notes and exercise solution videos are now accessible for all batch
                  chapters.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-500">✓ FREE PASS ACTIVE</span>
                  <span className="text-[10px] text-muted-foreground font-mono">2h ago</span>
                </div>
                <h4 className="text-xs font-bold text-foreground">100% Free Access Unlocked</h4>
                <p className="text-[11px] text-muted-foreground">
                  All recorded sessions, lecture PDFs, and study materials are freely unlocked for
                  every aspirant.
                </p>
              </div>
            </div>
          )}

          {type === "rewards" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
                🎁
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Daily Study Streak Reward</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Watch continuous lectures for 2 minutes each to accumulate XP and unlock digital
                  achievement badges!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Streak Bonus
                  </span>
                  <div className="text-lg font-black text-primary mt-0.5">🔥 10 XP / Day</div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Access Pass
                  </span>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    100% Free
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === "profile" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-muted/40">
                <div className="h-14 w-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary">
                  🎓
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Aspirant Student</h4>
                  <p className="text-xs text-muted-foreground">Free Learning Portal Member</p>
                  <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                    Verified Free Pass
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl border border-border bg-card">
                  <span className="text-muted-foreground text-[10px] block">Target Exam</span>
                  <span className="font-bold text-foreground">JEE & NEET 2026/27</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-card">
                  <span className="text-muted-foreground text-[10px] block">Language</span>
                  <span className="font-bold text-foreground">Hinglish</span>
                </div>
              </div>
            </div>
          )}

          {type === "history" && (
            <div className="text-center py-6 text-muted-foreground text-xs">
              <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-semibold text-foreground">Recent Study Sessions</p>
              <p className="text-[11px] mt-1">
                Your watched chapters and XP accumulated will automatically appear here.
              </p>
            </div>
          )}

          {type === "bookmarks" && (
            <div className="text-center py-6 text-muted-foreground text-xs">
              <Bookmark className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-semibold text-foreground">No Bookmarks Saved Yet</p>
              <p className="text-[11px] mt-1">
                Bookmark important lectures and DPPs while watching classes.
              </p>
            </div>
          )}

          {type === "refer" && (
            <div className="space-y-3 text-center py-2">
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Share with Friends</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Share this portal link with friends preparing for JEE & NEET.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.origin);
                  }
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold px-5 py-2.5 text-xs shadow-md shadow-primary/25 hover:opacity-90 transition cursor-pointer"
              >
                Copy Portal Link
              </button>
            </div>
          )}

          {type === "about" && (
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-foreground font-medium">
                Physics Wallah Free Access Study Portal providing high quality educational lectures,
                chapter notes, and daily practice problems (DPPs).
              </div>
              <p>All video streams and lecture materials are directly accessible without fees.</p>
              <div className="pt-2">
                <Link
                  to="/"
                  search={{ tab: "batches" }}
                  onClick={onClose}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground py-2 text-xs font-bold hover:opacity-90"
                >
                  Browse Batches
                </Link>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
