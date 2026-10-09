import { useState, useEffect } from "react";
import { CheckCircle2, BookmarkX, Sparkles } from "lucide-react";

interface ToastData {
  id: number;
  action: "enrolled" | "unenrolled";
  batchName: string;
}

export function EnrollmentToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        action: "enrolled" | "unenrolled";
        batchName: string;
      }>;
      const { action, batchName } = customEvent.detail || {};
      if (!batchName) return;

      const newToast: ToastData = {
        id: Date.now() + Math.random(),
        action,
        batchName,
      };

      setToasts((prev) => [...prev.slice(-2), newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    };

    window.addEventListener("pw-enrollment-toast", handler);
    return () => window.removeEventListener("pw-enrollment-toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            toast.action === "enrolled"
              ? "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100"
              : "border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100"
          }`}
        >
          {toast.action === "enrolled" ? (
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <BookmarkX className="h-4 w-4" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {toast.action === "enrolled" ? (
                <>
                  <span className="text-emerald-700 dark:text-emerald-300">Batch Enrolled!</span>
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                </>
              ) : (
                <span className="text-slate-600 dark:text-slate-300">Unenrolled</span>
              )}
            </div>
            <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
              {toast.batchName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
