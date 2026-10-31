import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { UserCheck, Sparkles, GraduationCap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

function getSessionId() {
  try {
    let id = localStorage.getItem("pw_session_id");
    if (!id) {
      id = "std_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
      localStorage.setItem("pw_session_id", id);
    }
    return id;
  } catch {
    return "std_guest";
  }
}

export function StudentTracker() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [inputVal, setInputVal] = useState("");

  const sendEvent = (eventType: string, extra: Record<string, unknown> = {}) => {
    if (typeof window === "undefined") return;
    try {
      const currentName = localStorage.getItem("pw_student_name") || "";
      const payload = {
        sessionId: getSessionId(),
        studentName: currentName,
        screenResolution: window.screen
          ? `${window.screen.width}x${window.screen.height}`
          : "Unknown",
        pageUrl: window.location.href,
        eventType,
        timestamp: new Date().toISOString(),
        ...extra,
      };

      const jsonStr = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        const blob = new Blob([jsonStr], { type: "application/json" });
        if (navigator.sendBeacon("/api/log", blob)) return;
      }

      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonStr,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore
    }
  };

  // 1. Check if name is already set on initial load
  useEffect(() => {
    const savedName = localStorage.getItem("pw_student_name")?.trim();
    if (savedName) {
      setStudentName(savedName);
      sendEvent("page_visit", { pageTitle: document.title });
    } else {
      // Delay showing popup by 1s for smoother initial load
      const t = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, []);

  // 2. Track route transitions
  useEffect(() => {
    return router.subscribe("onResolved", ({ toLocation }) => {
      sendEvent("page_visit", {
        pageTitle: document.title,
        pageUrl: window.location.origin + toLocation.pathname + toLocation.searchStr,
      });
    });
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;

    localStorage.setItem("pw_student_name", clean);
    setStudentName(clean);
    setIsOpen(false);

    sendEvent("page_visit", {
      studentName: clean,
      pageTitle: document.title,
      extra: { action: "student_identified", name: clean },
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <DialogContent className="max-w-md overflow-hidden p-0 border border-primary/30 bg-card shadow-2xl rounded-2xl z-[120]">
          <DialogTitle className="sr-only">Welcome Aspirant</DialogTitle>

          {/* Header Banner */}
          <div className="relative bg-gradient-to-r from-amber-500/20 via-primary/15 to-amber-600/20 p-6 pb-5 border-b border-border text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-primary/40 text-primary shadow-md shadow-primary/10 mb-3">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight text-foreground">
              Welcome to Physics Wallah!
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Enter your name to track your lectures, DPP notes, and study progress.
            </p>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="studentNameInput" className="text-xs font-bold text-foreground">
                Your Full Name / Aspirant Nickname
              </label>
              <input
                id="studentNameInput"
                type="text"
                autoFocus
                required
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="e.g. Rahul Sharma or JEE Aspirant"
                className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                <UserCheck className="h-4 w-4" />
                <span>Start Learning</span>
              </button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground">
              ⚡ Stored locally on this device. You can update it anytime in Settings.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
