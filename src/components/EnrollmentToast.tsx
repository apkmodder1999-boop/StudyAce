import { useState, useEffect } from "react";
import { CheckCircle2, BookmarkX } from "lucide-react";

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
          className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 text-foreground"
        >
          {toast.action === "enrolled" ? (
            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <BookmarkX className="h-4 w-4" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">
              {toast.action === "enrolled" ? "Batch Enrolled" : "Batch Unenrolled"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground mt-0.5">{toast.batchName}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
