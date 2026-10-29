import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Shield,
  KeyRound,
  Users,
  Radio,
  Eye,
  Clock,
  BookOpen,
  Send,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  ExternalLink,
  Laptop,
  Smartphone,
  Globe,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText,
  User,
  Edit2,
  Check,
  X,
  History,
} from "lucide-react";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal & Live Telemetry — Physics Wallah" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

interface StudentSession {
  sessionId: string;
  studentName: string;
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  device: string;
  screenResolution?: string;
  currentUrl?: string;
  currentAction: string;
  activeLecture?: string;
  totalStudySeconds: number;
  totalVisits: number;
  firstSeen: string;
  lastActive: string;
  isOnline: boolean;
  history: Array<{
    action: string;
    detail: string;
    time: string;
  }>;
}

interface LogEvent {
  id: string;
  sessionId: string;
  studentName: string;
  eventType: string;
  lectureTitle?: string;
  watchTime?: string;
  watchSeconds?: number;
  screenResolution?: string;
  pageUrl?: string;
  ip: string;
  userAgent: string;
  device: string;
  timestamp: string;
}

interface DashboardData {
  overview: {
    activeOnlineUsers: number;
    totalVisits: number;
    dailyActiveUsers: number;
    totalStudySeconds: number;
    totalStudyFormatted: string;
    totalRegisteredStudents: number;
  };
  students: StudentSession[];
  recentEvents: LogEvent[];
}

function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [activeSection, setActiveSection] = useState<
    "all" | "online" | "watching" | "notes" | "events"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentSession | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // Check saved authentication in session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPass =
        sessionStorage.getItem("pw_admin_passcode") || localStorage.getItem("pw_admin_passcode");
      if (savedPass && savedPass.trim().toUpperCase() === "NAITIK") {
        setIsAuthenticated(true);
        fetchStats(savedPass.trim());
      }
    }
  }, []);

  // Poll live data every 10 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const currentPass = sessionStorage.getItem("pw_admin_passcode") || "NAITIK";
    const interval = setInterval(() => {
      fetchStats(currentPass, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const trimmed = passcode.trim().toUpperCase();
    if (trimmed === "NAITIK") {
      sessionStorage.setItem("pw_admin_passcode", "NAITIK");
      setIsAuthenticated(true);
      fetchStats("NAITIK");
    } else {
      setErrorMsg("Incorrect Passcode. Access Denied.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("pw_admin_passcode");
    localStorage.removeItem("pw_admin_passcode");
    setIsAuthenticated(false);
    setStats(null);
    setPasscode("");
  };

  const fetchStats = async (authPass: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?passcode=${encodeURIComponent(authPass)}`, {
        headers: { "x-admin-passcode": authPass },
      });
      if (res.ok) {
        const data = (await res.json()) as DashboardData;
        setStats(data);
      } else {
        if (!isSilent) setErrorMsg("Session expired or invalid passcode.");
        setIsAuthenticated(false);
      }
    } catch {
      // ignore transient fetch error
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSaveStudentName = async (sessionId: string) => {
    if (!editingNameValue.trim()) return;
    try {
      await fetch("/api/admin/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, name: editingNameValue.trim() }),
      });
      setEditingStudentId(null);
      const currentPass = sessionStorage.getItem("pw_admin_passcode") || "NAITIK";
      fetchStats(currentPass, true);
      if (selectedStudent && selectedStudent.sessionId === sessionId) {
        setSelectedStudent((prev) =>
          prev ? { ...prev, studentName: editingNameValue.trim() } : null,
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter students based on active section and search
  const filteredStudents = useMemo(() => {
    if (!stats?.students) return [];
    let list = stats.students;

    if (activeSection === "online") {
      list = list.filter((s) => s.isOnline);
    } else if (activeSection === "watching") {
      list = list.filter((s) => s.currentAction.toLowerCase().includes("watch"));
    } else if (activeSection === "notes") {
      list = list.filter((s) => s.currentAction.toLowerCase().includes("pdf"));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          s.ip.toLowerCase().includes(q) ||
          (s.city && s.city.toLowerCase().includes(q)) ||
          s.currentAction.toLowerCase().includes(q) ||
          s.device.toLowerCase().includes(q),
      );
    }

    return list;
  }, [stats?.students, activeSection, searchQuery]);

  // Passcode Gate Screen
  if (!isAuthenticated) {
    return (
      <Shell>
        <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl bg-card border border-primary/30 p-7 sm:p-8 shadow-2xl shadow-primary/10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shadow-inner">
              <Shield className="h-8 w-8 stroke-[2.2]" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              PW Admin Intelligence
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Enter the admin passcode to view real-time online students, live telemetry, and study
              logs.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode (e.g. NAITIK)..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive text-left font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-primary hover:opacity-95 active:scale-[0.98] font-bold text-sm text-primary-foreground shadow-lg shadow-primary/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="h-4 w-4" />
                <span>Unlock Dashboard</span>
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-border flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <span>Passcode:</span>
              <code className="bg-muted px-2 py-0.5 rounded font-mono font-bold text-primary">
                NAITIK
              </code>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  const overview = stats?.overview;
  const onlineCount = stats?.students.filter((s) => s.isOnline).length || 0;
  const watchingCount =
    stats?.students.filter((s) => s.currentAction.toLowerCase().includes("watch")).length || 0;
  const notesCount =
    stats?.students.filter((s) => s.currentAction.toLowerCase().includes("pdf")).length || 0;

  return (
    <Shell>
      <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden min-w-0">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold shadow-2xs">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-foreground">
                  PW Admin Dashboard
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Passcode verified: <code className="font-mono text-primary font-bold">NAITIK</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => fetchStats("NAITIK")}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer"
              title="Refresh live metrics"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/15 border border-destructive/30 hover:bg-destructive/25 text-xs font-bold text-destructive transition cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Lock</span>
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Cards (Active Online, Total Visits, DAU, Study Time, Students) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Live Online Users */}
          <div
            onClick={() => setActiveSection("online")}
            className={`card-surface p-4 rounded-2xl cursor-pointer transition-all border ${
              activeSection === "online"
                ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                : "border-border hover:border-emerald-500/40 bg-card"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider">Active Online</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {overview?.activeOnlineUsers ?? 1}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              🟢 Live right now
            </p>
          </div>

          {/* Card 2: Total Visits */}
          <div
            onClick={() => setActiveSection("all")}
            className={`card-surface p-4 rounded-2xl cursor-pointer transition-all border ${
              activeSection === "all"
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10 scale-[1.02]"
                : "border-border hover:border-primary/40 bg-card"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider">Total Visits</span>
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {overview?.totalVisits ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">
              All pageviews recorded
            </p>
          </div>

          {/* Card 3: Daily Active Users */}
          <div
            onClick={() => setActiveSection("all")}
            className="card-surface p-4 rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider">Daily Active</span>
              <Users className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {overview?.dailyActiveUsers ?? 1}
            </div>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">
              Students active today
            </p>
          </div>

          {/* Card 4: Total Study Time */}
          <div
            onClick={() => setActiveSection("watching")}
            className={`card-surface p-4 rounded-2xl cursor-pointer transition-all border ${
              activeSection === "watching"
                ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 scale-[1.02]"
                : "border-border hover:border-blue-500/40 bg-card"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider">
                Total Study Time
              </span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {overview?.totalStudyFormatted || "0m"}
            </div>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
              ⏱️ Cumulative watched
            </p>
          </div>
        </div>

        {/* Clickable Sections Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveSection("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                activeSection === "all"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Students ({stats?.students.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("online")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeSection === "online"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/25"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>🟢 Live Online ({onlineCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("watching")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeSection === "watching"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Watching Lectures ({watchingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("notes")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeSection === "notes"
                  ? "bg-orange-600 text-white shadow-sm shadow-orange-500/25"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>Notes & PDFs ({notesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("events")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeSection === "events"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="h-3 w-3" />
              <span>Live Event Stream</span>
            </button>
          </div>

          {/* Search Filter Input */}
          {activeSection !== "events" && (
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, IP, city..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* SECTION 1: STUDENTS CARDS GRID */}
        {activeSection !== "events" && (
          <div className="space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-xs text-muted-foreground">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="font-bold text-foreground">No students found in this filter.</p>
                <p className="mt-1">
                  As visitors access the website or watch lectures, they will appear here
                  automatically.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStudents.map((student) => {
                  const isEditingThis = editingStudentId === student.sessionId;

                  return (
                    <div
                      key={student.sessionId}
                      onClick={() => setSelectedStudent(student)}
                      className="card-surface p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer flex flex-col justify-between gap-3 group relative overflow-hidden"
                    >
                      {/* Top Bar: Online Dot + Student Name + Rename */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              student.isOnline
                                ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                                : "bg-slate-400"
                            }`}
                            title={student.isOnline ? "Active now" : "Offline"}
                          />

                          {isEditingThis ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 min-w-0 flex-1"
                            >
                              <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                autoFocus
                                className="w-full px-2 py-0.5 text-xs font-bold rounded border border-primary bg-background text-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveStudentName(student.sessionId)}
                                className="p-1 rounded bg-primary text-primary-foreground hover:opacity-90"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudentId(null)}
                                className="p-1 rounded bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-extrabold text-foreground truncate group-hover:text-primary transition flex items-center gap-1.5">
                                <span>{student.studentName}</span>
                              </h3>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">
                                ID: {student.sessionId.slice(0, 14)}…
                              </p>
                            </div>
                          )}
                        </div>

                        {!isEditingThis && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStudentId(student.sessionId);
                              setEditingNameValue(student.studentName);
                            }}
                            className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition opacity-0 group-hover:opacity-100"
                            title="Rename student"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Current Action / What user is doing right now */}
                      <div className="rounded-xl bg-muted/60 p-2.5 border border-border/70 text-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-0.5">
                          Current Action
                        </span>
                        <p className="font-bold text-foreground line-clamp-2 leading-snug">
                          {student.currentAction}
                        </p>
                      </div>

                      {/* Meta Details: Location, IP, Device, Time Studied */}
                      <div className="space-y-1.5 pt-1 text-[11px] text-muted-foreground border-t border-border/60">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>Study Time:</span>
                          </span>
                          <span className="font-bold text-foreground">
                            {formatDuration(student.totalStudySeconds)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span>IP:</span>
                          </span>
                          <code className="font-mono text-[10px] text-foreground bg-muted px-1.5 py-0.2 rounded truncate max-w-[130px]">
                            {student.ip}
                          </code>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>Location:</span>
                          </span>
                          <span className="truncate max-w-[130px] text-right font-medium text-foreground">
                            {[student.city, student.country].filter(Boolean).join(", ") || "India"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            {student.device.toLowerCase().includes("phone") ||
                            student.device.toLowerCase().includes("android") ? (
                              <Smartphone className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Laptop className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span>Device:</span>
                          </span>
                          <span className="truncate max-w-[130px] text-right font-medium text-foreground">
                            {student.device}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Footer: Click to inspect */}
                      <div className="pt-2 flex items-center justify-between text-[11px] text-primary font-bold">
                        <span>View timeline & actions</span>
                        <span>→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: LIVE EVENTS STREAM */}
        {activeSection === "events" && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary animate-pulse" />
                <h3 className="text-sm font-bold text-foreground">
                  Real-Time Event Stream ({stats?.recentEvents.length || 0})
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">Auto-updates live</span>
            </div>

            <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
              {!stats?.recentEvents || stats.recentEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No events captured yet. Browse portal to see logs streaming in.
                </div>
              ) : (
                stats.recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 sm:p-4 hover:bg-muted/40 transition flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {evt.eventType === "lecture_play" ? (
                          <Play className="h-4 w-4 text-emerald-500 fill-current" />
                        ) : evt.eventType === "pdf_download" ? (
                          <FileText className="h-4 w-4 text-orange-500" />
                        ) : evt.eventType === "lecture_pause" ||
                          evt.eventType === "lecture_progress" ? (
                          <Clock className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-primary" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">{evt.studentName}</span>
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                            {evt.ip}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                            {evt.eventType.replace("_", " ")}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-foreground font-medium">
                          {evt.lectureTitle || evt.pageUrl || "Visited Portal"}
                        </p>

                        {evt.watchTime && (
                          <p className="mt-0.5 text-[11px] text-blue-500 font-semibold font-mono">
                            ⏱️ Watch Duration: {evt.watchTime}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground shrink-0 font-mono text-right">
                      {formatTimeAgo(evt.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STUDENT DETAIL MODAL / DRAWER */}
        {selectedStudent && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedStudent(null)}
          >
            <div
              className="bg-card border border-border w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-xl font-bold">
                    🎓
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-foreground">
                      {selectedStudent.studentName}
                    </h2>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${selectedStudent.isOnline ? "text-emerald-500" : "text-muted-foreground"}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${selectedStudent.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
                        />
                        {selectedStudent.isOnline ? "Active Now" : "Offline"}
                      </span>
                      <span>·</span>
                      <span className="text-muted-foreground">
                        Studied {formatDuration(selectedStudent.totalStudySeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Student Live Action Card */}
              <div className="rounded-2xl bg-primary/10 border border-primary/25 p-3.5">
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider block mb-1">
                  Currently Doing
                </span>
                <p className="text-sm font-bold text-foreground">{selectedStudent.currentAction}</p>
                {selectedStudent.currentUrl && (
                  <p className="mt-1 text-xs text-muted-foreground font-mono truncate">
                    URL: {selectedStudent.currentUrl}
                  </p>
                )}
              </div>

              {/* Technical / Network Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-border bg-background p-2.5">
                  <span className="text-[10px] text-muted-foreground font-bold block mb-0.5">
                    IP Address
                  </span>
                  <code className="font-mono text-foreground font-bold break-all">
                    {selectedStudent.ip}
                  </code>
                </div>
                <div className="rounded-xl border border-border bg-background p-2.5">
                  <span className="text-[10px] text-muted-foreground font-bold block mb-0.5">
                    Location & ISP
                  </span>
                  <p className="font-medium text-foreground truncate">
                    {[selectedStudent.city, selectedStudent.country].filter(Boolean).join(", ") ||
                      "India"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {selectedStudent.isp || "Airtel/Jio"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-2.5">
                  <span className="text-[10px] text-muted-foreground font-bold block mb-0.5">
                    Device & Screen
                  </span>
                  <p className="font-medium text-foreground">{selectedStudent.device}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {selectedStudent.screenResolution || "Unknown Screen"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-2.5">
                  <span className="text-[10px] text-muted-foreground font-bold block mb-0.5">
                    Visits & Duration
                  </span>
                  <p className="font-bold text-foreground">
                    {selectedStudent.totalVisits} sessions
                  </p>
                  <p className="text-[10px] text-primary font-bold">
                    {formatDuration(selectedStudent.totalStudySeconds)} total watch time
                  </p>
                </div>
              </div>

              {/* Student Chronological Activity Log */}
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-primary" />
                  <span>Recent Action History</span>
                </h4>
                <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {selectedStudent.history.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No actions recorded yet.
                    </div>
                  ) : (
                    selectedStudent.history.map((h, i) => (
                      <div
                        key={i}
                        className="p-2.5 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">{h.action}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{h.detail}</p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {formatTimeAgo(h.time)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function formatDuration(totalSecs: number): string {
  const secs = Math.floor(totalSecs || 0);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
