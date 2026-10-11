import { useState, useEffect } from "react";
import { Zap, Flame, Clock, X, CheckCircle } from "lucide-react";
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
      <DialogContent className="max-w-md overflow-hidden p-0 border border-border bg-card shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Physics Wallah (PW) XP & Student Level Status</DialogTitle>

        {/* Top Header Card */}
        <div className="relative bg-muted/50 p-6 pb-5 border-b border-border">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card border border-border text-2xl shadow-xs">
              <span>{levelInfo.badge}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Level {levelInfo.level} · {levelInfo.title}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-mono tabular-nums font-bold text-foreground">
                  {totalXp} XP
                </span>{" "}
                earned · 1 XP per 2 mins watched
              </p>
            </div>
          </div>
        </div>

        {/* Level Progress Bar & Stats */}
        <div className="p-6 space-y-4">
          {/* Progress to Next Level */}
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Level Milestone</span>
              <span className="text-primary font-mono tabular-nums text-[11px]">
                {levelInfo.xpNeededForNext > 0
                  ? `${levelInfo.xpNeededForNext} XP to Lvl ${levelInfo.level + 1}`
                  : "Max Level Reached"}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium pt-0.5 font-mono tabular-nums">
              <span>{levelInfo.minXp} XP</span>
              <span>{levelInfo.progressPercent}% complete</span>
              <span>{levelInfo.maxXp} XP</span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border bg-card p-2.5">
              <div className="grid h-6 w-6 mx-auto place-items-center rounded-md bg-muted text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs font-bold text-foreground font-mono tabular-nums">
                {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
              </p>
              <p className="text-[10px] text-muted-foreground">Watch Time</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-2.5">
              <div className="grid h-6 w-6 mx-auto place-items-center rounded-md bg-muted text-amber-500 mb-1">
                <Flame className="h-3.5 w-3.5 fill-current" />
              </div>
              <p className="text-xs font-bold text-foreground font-mono tabular-nums">
                {streakDays} Day{streakDays === 1 ? "" : "s"}
              </p>
              <p className="text-[10px] text-muted-foreground">Study Streak</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-2.5">
              <div className="grid h-6 w-6 mx-auto place-items-center rounded-md bg-muted text-primary mb-1">
                <Zap className="h-3.5 w-3.5 fill-current" />
              </div>
              <p className="text-xs font-bold text-foreground font-mono tabular-nums">
                +{todayXp} XP
              </p>
              <p className="text-[10px] text-muted-foreground">Today</p>
            </div>
          </div>

          {/* Current 2-min Cycle Active Tracker */}
          <div className="rounded-lg border border-border p-3 bg-muted/20 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
                <span>Current Watch Interval</span>
                <span className="text-primary font-mono tabular-nums">
                  {Math.floor(unclaimedSeconds / 60)}m {unclaimedSeconds % 60}s / 2m
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${currentCyclePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Level Roadmap */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-foreground">Level Progression</p>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1 scrollbar-none">
              {allLevels.map((lvl) => {
                const isCurrent = lvl.level === levelInfo.level;
                const isPassed = totalXp >= lvl.maxXp;

                return (
                  <div
                    key={lvl.level}
                    className={`flex items-center justify-between px-2.5 py-1 rounded-md text-xs transition ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-bold border border-primary/30"
                        : isPassed
                          ? "text-muted-foreground line-through opacity-70"
                          : "text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{lvl.badge}</span>
                      <span>
                        Lvl {lvl.level}: {lvl.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono tabular-nums">
                      <span>
                        {lvl.minXp}–{lvl.maxXp} XP
                      </span>
                      {isPassed && <CheckCircle className="h-3 w-3 text-primary ml-0.5" />}
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
    <div className="fixed top-18 right-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2 text-foreground shadow-lg backdrop-blur-md">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
          <Zap className="h-3.5 w-3.5 fill-current" />
        </div>
        <div>
          <p className="text-xs font-bold">+{toast.amount} XP Earned</p>
          <p className="text-[10px] text-muted-foreground">
            {toast.leveledUp ? "Level Up achieved!" : "Lecture watch interval complete"}
          </p>
        </div>
      </div>
    </div>
  );
}
