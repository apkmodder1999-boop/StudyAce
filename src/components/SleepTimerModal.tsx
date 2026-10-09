import { useState } from "react";
import { Moon, Clock, Play, X, Plus, AlertCircle, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRemainingSeconds: number | null; // null if no timer active
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

  // Remaining time in the current lecture
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
      <DialogContent className="max-w-md overflow-hidden p-0 border border-indigo-200 dark:border-indigo-950 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">Video Lecture Sleep Timer</DialogTitle>

        {/* Top Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 px-6 pt-7 pb-6 text-white">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-black/20 text-white/90 hover:bg-black/35 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-2.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 shadow-inner">
              <Moon className="h-7 w-7 fill-current" />
            </div>

            <h3 className="text-xl font-extrabold tracking-tight text-white">
              Lecture Sleep Timer
            </h3>
            <p className="mt-1 text-xs text-indigo-200 max-w-xs font-medium">
              Automatically pauses lecture playback after your selected duration
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Active Timer Display if Running */}
          {activeRemainingSeconds !== null && activeRemainingSeconds > 0 && (
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 text-center space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Clock className="h-3.5 w-3.5 animate-spin" />
                <span>Timer Active</span>
              </span>

              <div className="text-3xl font-black font-mono tracking-tight text-indigo-900 dark:text-indigo-100">
                {formatCountdown(activeRemainingSeconds)}
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSetTimer(activeRemainingSeconds + 5 * 60)}
                  className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>5 mins</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetTimer(activeRemainingSeconds + 15 * 60)}
                  className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
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
                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 cursor-pointer"
                >
                  <span>Turn Off</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Presets Grid */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Quick Timer Presets
            </p>
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
                    className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500 text-white shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{p.label}</span>
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
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
                  className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-800/30 p-3 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/70 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Play className="h-3.5 w-3.5 text-indigo-500" />
                    <span>End of Current Video</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    ~{endOfVideoMins} min{endOfVideoMins === 1 ? "" : "s"} left
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Custom Minute Input */}
          <form
            onSubmit={handleApplyCustom}
            className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800"
          >
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Duration</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="360"
                value={customMins}
                onChange={(e) => setCustomMins(e.target.value)}
                placeholder="Enter minutes (e.g. 20)"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
              />
              <button
                type="submit"
                disabled={!customMins || parseInt(customMins, 10) <= 0}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-500"
    >
      <div className="relative max-w-sm w-full rounded-3xl border border-indigo-900 bg-slate-950 p-6 text-center text-white shadow-2xl space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <Moon className="h-8 w-8 fill-current animate-pulse" />
        </div>

        <div>
          <h4 className="text-lg font-black tracking-tight text-white">Sleep Timer Paused</h4>
          <p className="mt-1.5 text-xs text-indigo-200 leading-relaxed">
            Your lecture was paused so you can rest comfortably without losing your place.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-3 text-xs font-bold text-white shadow-lg transition hover:brightness-110 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Resume Lecture</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </aside>
  );
}
