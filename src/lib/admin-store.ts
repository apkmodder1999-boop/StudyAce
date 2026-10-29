/**
 * In-memory Store for Real-Time Visitor Analytics, Active Online Users & Study Time.
 */

export interface LogEvent {
  id: string;
  sessionId: string;
  studentName: string;
  eventType:
    | "page_visit"
    | "lecture_play"
    | "lecture_progress"
    | "lecture_pause"
    | "pdf_download"
    | "heartbeat";
  subject?: string;
  chapter?: string;
  lectureTitle?: string;
  watchTime?: string;
  watchSeconds?: number;
  screenResolution?: string;
  pageUrl?: string;
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  userAgent: string;
  device: string;
  timestamp: string;
}

export interface StudentSession {
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

// In-memory data store
const sessionsMap = new Map<string, StudentSession>();
const recentEvents: LogEvent[] = [];
const MAX_EVENTS_LIMIT = 500;

// Strictly Real-Time Data (NO fake seeds, NO dummy numbers)
let totalAllTimeVisits = 0;
let totalAllTimeStudySeconds = 0;

export function recordEvent(data: Partial<LogEvent>): LogEvent {
  const now = new Date();
  const timestamp = now.toISOString();

  const ip = data.ip || "Unknown IP";
  const userAgent = data.userAgent || "Unknown Device";
  const rawSessionId =
    data.sessionId || `${ip.replace(/[^a-zA-Z0-9]/g, "")}_${userAgent.slice(0, 20)}`;
  const sessionId = rawSessionId.trim();

  const studentName =
    data.studentName && data.studentName.trim()
      ? data.studentName.trim()
      : getAnonymousName(sessionId);

  const event: LogEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sessionId,
    studentName,
    eventType: (data.eventType as LogEvent["eventType"]) || "page_visit",
    subject: data.subject,
    chapter: data.chapter,
    lectureTitle: data.lectureTitle,
    watchTime: data.watchTime,
    watchSeconds: data.watchSeconds || 0,
    screenResolution: data.screenResolution,
    pageUrl: data.pageUrl,
    ip,
    city: data.city,
    region: data.region,
    country: data.country,
    isp: data.isp,
    userAgent,
    device: data.device || detectDevice(userAgent),
    timestamp,
  };

  // Add to chronological events log
  recentEvents.unshift(event);
  if (recentEvents.length > MAX_EVENTS_LIMIT) {
    recentEvents.pop();
  }

  // Update or create Student Session
  let session = sessionsMap.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      studentName,
      ip,
      city: data.city,
      region: data.region,
      country: data.country,
      isp: data.isp,
      device: event.device,
      screenResolution: data.screenResolution,
      currentUrl: data.pageUrl,
      currentAction: "Visiting Portal",
      activeLecture: undefined,
      totalStudySeconds: 0,
      totalVisits: 0,
      firstSeen: timestamp,
      lastActive: timestamp,
      isOnline: true,
      history: [],
    };
    sessionsMap.set(sessionId, session);
  }

  // Update session state
  session.studentName = studentName;
  session.lastActive = timestamp;
  session.isOnline = true;
  if (data.pageUrl) session.currentUrl = data.pageUrl;
  if (data.screenResolution) session.screenResolution = data.screenResolution;
  if (data.city) session.city = data.city;
  if (data.isp) session.isp = data.isp;

  // Track action specific metrics
  if (event.eventType === "page_visit") {
    totalAllTimeVisits++;
    session.totalVisits++;
    session.currentAction = `Viewing ${data.pageUrl?.split("/").pop() || "Portal"}`;
    session.history.unshift({
      action: "Page Visit",
      detail: data.pageUrl || "Opened website",
      time: timestamp,
    });
  } else if (event.eventType === "lecture_play") {
    session.currentAction = `▶️ Watching: ${data.lectureTitle || "Lecture"}`;
    session.activeLecture = data.lectureTitle;
    session.history.unshift({
      action: "Started Lecture",
      detail: data.lectureTitle || "Lecture video",
      time: timestamp,
    });
  } else if (event.eventType === "lecture_progress" || event.eventType === "lecture_pause") {
    const addedSeconds = data.watchSeconds || 15;
    session.totalStudySeconds += addedSeconds;
    totalAllTimeStudySeconds += addedSeconds;
    session.currentAction = `⏸️ Paused: ${data.lectureTitle || "Lecture"}`;
    session.history.unshift({
      action: "Watched Lecture",
      detail: `${data.lectureTitle || "Lecture"} (${formatDuration(addedSeconds)})`,
      time: timestamp,
    });
  } else if (event.eventType === "pdf_download") {
    session.currentAction = `📥 Opened PDF: ${data.lectureTitle || "Notes"}`;
    session.history.unshift({
      action: "Downloaded/Opened PDF",
      detail: data.lectureTitle || "Study Material PDF",
      time: timestamp,
    });
  } else if (event.eventType === "heartbeat") {
    if (data.watchSeconds && data.watchSeconds > 0) {
      session.totalStudySeconds += data.watchSeconds;
      totalAllTimeStudySeconds += data.watchSeconds;
    }
  }

  if (session.history.length > 30) {
    session.history.pop();
  }

  return event;
}

export function updateStudentName(sessionId: string, newName: string) {
  const session = sessionsMap.get(sessionId);
  if (session) {
    session.studentName = newName.trim();
  }
}

export function getAdminDashboardStats() {
  const now = Date.now();
  const ACTIVE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes for online presence

  const sessions = Array.from(sessionsMap.values());

  // Compute online status
  let activeOnlineCount = 0;
  for (const s of sessions) {
    const elapsed = now - new Date(s.lastActive).getTime();
    s.isOnline = elapsed <= ACTIVE_THRESHOLD_MS;
    if (s.isOnline) {
      activeOnlineCount++;
    }
  }

  // Sort sessions: Online first, then by last active
  sessions.sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
  });

  // Calculate unique daily visitors (seen in last 24 hours)
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const dailyActiveUsersCount = sessions.filter(
    (s) => now - new Date(s.lastActive).getTime() <= ONE_DAY_MS,
  ).length;

  return {
    overview: {
      activeOnlineUsers: activeOnlineCount,
      totalVisits: totalAllTimeVisits,
      dailyActiveUsers: dailyActiveUsersCount,
      totalStudySeconds: totalAllTimeStudySeconds,
      totalStudyFormatted: formatDuration(totalAllTimeStudySeconds),
      totalRegisteredStudents: sessions.length,
    },
    students: sessions,
    recentEvents: recentEvents.slice(0, 80),
  };
}

function getAnonymousName(sessionId: string): string {
  // Real session identifier if student has not entered a name yet
  const shortId = sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6) || "Guest";
  return `Visitor_${shortId}`;
}

function detectDevice(userAgent: string): string {
  if (/iphone/i.test(userAgent)) return "iPhone";
  if (/ipad/i.test(userAgent)) return "iPad";
  if (/android/i.test(userAgent)) return "Android Phone";
  if (/macintosh|mac os x/i.test(userAgent)) return "MacBook / macOS";
  if (/windows/i.test(userAgent)) return "Windows PC";
  if (/linux/i.test(userAgent)) return "Linux PC";
  return "Web Browser";
}

function formatDuration(totalSecs: number): string {
  const secs = Math.floor(totalSecs);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
