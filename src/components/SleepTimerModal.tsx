import { useState } from "react";
import { Moon, Clock, Play, X, Plus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRemainingSeconds: number | null;
  onSetTimer: (seconds: number) => void;
  onCancelTimer: () => void;
  videoDurationSeconds?: number;
  currentVideoTime?: number;
}

export function SleepTimerModal({
  isOpen,
  onClose,
  activeRemainingSeconds,
  onSetTimer,
  onCancelTimer,
  videoDurationSeconds = 0,
  currentVideoTime = 0,
}: SleepTimerModalProps) {
  const [customMins, setCustomMins] = useState("");

  const presets = [
    { label: "15 Minutes", minutes: 15 },
    { label: "30 Minutes", minutes: 30 },
    { label: "45 Minutes", minutes: 45 },
    { label: "60 Minutes", minutes: 60 },
    { label: "90 Minutes", minutes: 90 },
  ];

  const endOfVideoSeconds = Math.max(0, Math.floor(videoDurationSeconds - currentVideoTime));
  const endOfVideoMins = Math.ceil(endOfVideoSeconds / 60);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMins, 10);
    if (!isNaN(val) && val > 0 && val <= 360) {
      onSetTimer(val * 60);
      onClose();
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md overflow-hidden p-0 border border-border bg-card shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Video Lecture Sleep Timer</DialogTitle>

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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card border border-border text-foreground shadow-xs">
              <Moon className="h-6 w-6 fill-current text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Lecture Sleep Timer
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically pauses lecture playback after selected time
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Active Timer Display if Running */}
          {activeRemainingSeconds !== null && activeRemainingSeconds > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Clock className="h-3.5 w-3.5" />
                <span>Timer Active</span>
              </span>

              <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                {formatCountdown(activeRemainingSeconds)}
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSetTimer(activeRemainingSeconds + 5 * 60)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>5 mins</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetTimer(activeRemainingSeconds + 15 * 60)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>15 mins</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCancelTimer();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 cursor-pointer"
                >
                  <span>Turn Off</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Presets Grid */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground">Quick Timer Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => {
                const isSelected =
                  activeRemainingSeconds !== null &&
                  Math.abs(activeRemainingSeconds - p.minutes * 60) < 5;
                return (
                  <button
                    key={p.minutes}
                    type="button"
                    onClick={() => {
                      onSetTimer(p.minutes * 60);
                      onClose();
                    }}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{p.label}</span>
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                );
              })}

              {/* End of Current Lecture Option */}
              {endOfVideoSeconds > 60 && (
                <button
                  type="button"
                  onClick={() => {
                    onSetTimer(endOfVideoSeconds);
                    onClose();
                  }}
                  className="col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Play className="h-3.5 w-3.5 text-primary" />
                    <span>End of Current Lecture</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    ~{endOfVideoMins} min{endOfVideoMins === 1 ? "" : "s"} left
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Custom Minute Input */}
          <form onSubmit={handleApplyCustom} className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-bold text-foreground">Custom Duration</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="360"
                value={customMins}
                onChange={(e) => setCustomMins(e.target.value)}
                placeholder="Minutes (e.g. 20)"
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!customMins || parseInt(customMins, 10) <= 0}
                className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs transition hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Set
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Gentle Sleep Notification Overlay that appears when timer expires */
export function SleepTimerTriggeredOverlay({
  onDismiss,
  onResume,
}: {
  onDismiss: () => void;
  onResume: () => void;
}) {
  return (
    <aside
      aria-label="Sleep timer paused playback"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
    >
      <div className="relative max-w-sm w-full rounded-2xl border border-border bg-card p-6 text-center text-foreground shadow-2xl space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Moon className="h-7 w-7 fill-current" />
        </div>

        <div>
          <h4 className="text-base font-bold tracking-tight text-foreground">Sleep Timer Paused</h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Your lecture was paused so you can rest comfortably without losing your place.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-2xs transition hover:bg-primary/90 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Resume Lecture</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </aside>
  );
}
