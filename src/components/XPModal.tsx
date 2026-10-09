import { useState, useEffect } from "react";
import { Zap, Flame, Clock, Trophy, ChevronRight, X, Sparkles, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useXP } from "@/lib/xp-system";

export function XPModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    totalXp,
    totalWatchSeconds,
    todayXp,
    streakDays,
    levelInfo,
    unclaimedSeconds,
    secondsPerXp,
  } = useXP();

  const totalMinutes = Math.floor(totalWatchSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const currentCyclePercent = Math.min(100, Math.round((unclaimedSeconds / secondsPerXp) * 100));

  const allLevels = [
    { level: 1, title: "Aspirant", badge: "🌱", minXp: 0, maxXp: 10 },
    { level: 2, title: "Scholar", badge: "📚", minXp: 10, maxXp: 25 },
    { level: 3, title: "Focused Achiever", badge: "⚡", minXp: 25, maxXp: 50 },
    { level: 4, title: "Master Student", badge: "🎯", minXp: 50, maxXp: 100 },
    { level: 5, title: "Rank Booster", badge: "🔥", minXp: 100, maxXp: 200 },
    { level: 6, title: "Top Ranker", badge: "👑", minXp: 200, maxXp: 350 },
    { level: 7, title: "AIR 1 Contender", badge: "🏆", minXp: 350, maxXp: 1000 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md overflow-hidden p-0 border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">PW Study XP & Level Status</DialogTitle>

        {/* Top Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 px-6 pt-7 pb-6 text-white">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-amber-300/20 blur-lg pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-black/15 text-white/90 hover:bg-black/25 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Level Avatar Badge */}
            <div className="relative mb-2.5">
              <div className="absolute -inset-1.5 rounded-2xl bg-white/30 blur-sm animate-pulse" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-lg">
                <span>{levelInfo.badge}</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-0.5 text-[11px] font-bold tracking-wide uppercase text-amber-100 mb-1.5 border border-white/20">
              <Sparkles className="h-3 w-3 text-amber-200" />
              <span>
                Level {levelInfo.level} · {levelInfo.title}
              </span>
            </div>

            <h3 className="text-3xl font-black tracking-tight text-white">
              {totalXp} <span className="text-xl font-bold text-amber-100">XP</span>
            </h3>

            <p className="mt-1 text-xs text-amber-100 max-w-xs font-medium">
              Every 2 minutes of lecture watching earns +1 XP
            </p>
          </div>
        </div>

        {/* Level Progress Bar & Stats */}
        <div className="p-6 space-y-5">
          {/* Progress to Next Level */}
          <div className="rounded-2xl border border-amber-100 dark:border-slate-800 bg-amber-50/50 dark:bg-slate-800/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>Next Milestone</span>
              <span className="text-amber-600 dark:text-amber-400">
                {levelInfo.xpNeededForNext > 0
                  ? `${levelInfo.xpNeededForNext} XP to Level ${levelInfo.level + 1}`
                  : "Maximum Level Reached!"}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-amber-200/60 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-0.5">
              <span>Tier: {levelInfo.minXp} XP</span>
              <span>{levelInfo.progressPercent}% Completed</span>
              <span>Goal: {levelInfo.maxXp} XP</span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border border-sky-100 dark:border-slate-800 bg-sky-50/40 dark:bg-slate-800/40 p-3">
              <div className="grid h-7 w-7 mx-auto place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 mb-1">
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Watch Time
              </p>
            </div>

            <div className="rounded-xl border border-orange-100 dark:border-slate-800 bg-orange-50/40 dark:bg-slate-800/40 p-3">
              <div className="grid h-7 w-7 mx-auto place-items-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 mb-1">
                <Flame className="h-4 w-4 fill-current" />
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                {streakDays} Day{streakDays === 1 ? "" : "s"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Study Streak
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 dark:border-slate-800 bg-emerald-50/40 dark:bg-slate-800/40 p-3">
              <div className="grid h-7 w-7 mx-auto place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-1">
                <Zap className="h-4 w-4 fill-current" />
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100">+{todayXp} XP</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Earned Today
              </p>
            </div>
          </div>

          {/* Current 2-min Cycle Active Tracker */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                <span>Current Watch Cycle</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono">
                  {Math.floor(unclaimedSeconds / 60)}m {unclaimedSeconds % 60}s / 2m
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{ width: `${currentCyclePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Rank Ranks Road Map */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Level Road Map</p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {allLevels.map((lvl) => {
                const isCurrent = lvl.level === levelInfo.level;
                const isPassed = totalXp >= lvl.maxXp;

                return (
                  <div
                    key={lvl.level}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      isCurrent
                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-800"
                        : isPassed
                          ? "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 line-through"
                          : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{lvl.badge}</span>
                      <span>
                        Level {lvl.level}: {lvl.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span>
                        {lvl.minXp} - {lvl.maxXp} XP
                      </span>
                      {isPassed && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Micro XP Earned Toast that triggers whenever XP increases */
export function XPEarnedToast() {
  const [toast, setToast] = useState<{ amount: number; total: number; leveledUp?: boolean } | null>(
    null,
  );

  useEffect(() => {
    const handleAwarded = (e: Event) => {
      const customEvent = e as CustomEvent<{
        amount: number;
        newTotal: number;
        leveledUp?: boolean;
      }>;
      if (customEvent.detail) {
        setToast({
          amount: customEvent.detail.amount,
          total: customEvent.detail.newTotal,
          leveledUp: customEvent.detail.leveledUp,
        });
        setTimeout(() => setToast(null), 3500);
      }
    };

    window.addEventListener("pw-xp-awarded", handleAwarded);
    return () => window.removeEventListener("pw-xp-awarded", handleAwarded);
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed top-18 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-none">
      <div className="flex items-center gap-2.5 rounded-2xl border border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-white shadow-xl shadow-amber-500/25">
        <div className="grid h-7 w-7 place-items-center rounded-xl bg-white/20 text-white">
          <Zap className="h-4 w-4 fill-current animate-bounce" />
        </div>
        <div>
          <p className="text-xs font-black">+{toast.amount} XP Earned! 🎯</p>
          <p className="text-[10px] text-amber-100 font-medium">
            {toast.leveledUp ? "🎉 LEVEL UP! Check your profile!" : "2 min lecture watched"}
          </p>
        </div>
      </div>
    </div>
  );
}
