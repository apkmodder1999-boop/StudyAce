export const API_BASE = "https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com";

export type Batch = {
  _id: string;
  name: string;
  class?: string | undefined;
  byName?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  language?: string | undefined;
  previewImage?: string | undefined;
  feeTotal?: number | undefined;
  type?: string | undefined;
  slug?: string | undefined;
  status?: string | undefined;
  price?: Record<string, unknown> | undefined;
};

export type Subject = {
  _id: string;
  subject: string;
  subjectName?: string;
  subjectId?: string;
  status?: string;
  isCopilotEnabled?: boolean;
  imageId?: { baseUrl?: string; key?: string };
  teacherIds?: ({ firstName?: string; lastName?: string } | string)[];
  lectureCount?: number;
  tagCount?: number;
};

export type Topic = {
  _id: string;
  name: string;
  slug?: string | undefined;
  videos?: number | undefined;
  notes?: number | undefined;
  exercises?: number | undefined;
  lectureVideos?: number | undefined;
  displayOrder?: number | undefined;
};

export type Attachment = {
  baseUrl?: string | undefined;
  key?: string | undefined;
  name?: string | undefined;
  url?: string | undefined;
  download_url?: string | undefined;
  fileUrl?: string | undefined;
  _id?: string | undefined;
};

export type ContentItem = {
  _id: string;
  topic?: string | undefined;
  name?: string | undefined;
  type?: string | undefined;
  slug?: string | undefined;
  url?: string | undefined;
  urlType?: string | undefined;
  status?: string | undefined;
  date?: string | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  maxStartTime?: string | undefined;
  maxDuration?: number | undefined;
  totalQuestions?: number | undefined;
  totalMarks?: number | undefined;
  modeType?: string | undefined;
  template?: string | undefined;
  tag2?: string | undefined;
  difficultyLevel?: string | undefined;
  infoMessage?: string | undefined;
  toastImage?:
    | {
        mobile?: string | undefined;
        web?: string | undefined;
        ios?: string | undefined;
      }
    | undefined;
  isDPPNotes?: boolean | undefined;
  isVideoLecture?: boolean | undefined;
  tags?: { _id: string; name: string }[] | undefined;
  videoDetails?:
    | {
        _id?: string | undefined;
        id?: string | undefined;
        name?: string | undefined;
        image?: string | undefined;
        duration?: string | undefined;
        videoUrl?: string | undefined;
        embedCode?: string | undefined;
      }
    | undefined;
  homeworkIds?:
    | {
        _id?: string | undefined;
        topic?: string | undefined;
        note?: string | undefined;
        attachmentIds?: Attachment[] | undefined;
      }[]
    | undefined;
  attachmentIds?: Attachment[] | undefined;
};

export const CONTENT_TYPES = ["Videos", "notes", "DppNotes", "Test"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

const BATCHES_CACHE_KEY = "pw_batches_cached_list_v1";
const BATCHES_CACHE_TIME_KEY = "pw_batches_cached_time_v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

// In-memory cache for instant route switches
let memoryBatchesCache: Batch[] | null = null;

/** Helper for fetching with a strict timeout */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 2500,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/** Same-origin fallback for API calls the upstream blocks by referring domain. */
function proxied(url: string) {
  try {
    const u = new URL(url);
    const pathname = u.pathname.startsWith("/radha") ? u.pathname.slice(6) : u.pathname;
    return `/api/public/pw${pathname}${u.search}`;
  } catch {
    return `/api/public/pw/${url}`;
  }
}

/** Helper to read optional student token from client storage */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("pw_token") || localStorage.getItem("token") || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    if (token.trim()) {
      localStorage.setItem("pw_token", token.trim());
    } else {
      localStorage.removeItem("pw_token");
      localStorage.removeItem("token");
    }
  } catch (err) {
    void err;
  }
}

async function getJSON<T>(url: string): Promise<T> {
  const token = getStoredToken();
  const requestHeaders: Record<string, string> = {};
  if (token) {
    requestHeaders["authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  // 1. Try same-origin server proxy first (ensures complete attachment keys without CORS/whitelist blocks)
  try {
    const proxyUrl = proxied(url);
    const res = await fetchWithTimeout(proxyUrl, { headers: requestHeaders }, 2500);
    if (res.ok) {
      const data = await res.json();
      return data as T;
    }
    if (res.status === 401) {
      const errJson = await res.json().catch(() => null);
      const msg =
        errJson?.error?.message || errJson?.message || "Token expired / Unauthorised Access";
      throw new Error(
        `Upstream server session expired (${msg}). The Learn-Topper and PW public proxy token must be renewed.`,
      );
    }
  } catch (e) {
    if ((e as Error).message?.includes("Upstream server session expired")) throw e;
  }

  // 2. Fallback to direct URL (only if not an auth failure)
  try {
    const res = await fetchWithTimeout(url, { headers: requestHeaders }, 2500);
    if (res.ok) {
      const data = await res.json();
      return data as T;
    }
    if (res.status === 401) {
      const errJson = await res.json().catch(() => null);
      const msg =
        errJson?.error?.message || errJson?.message || "Token expired / Unauthorised Access";
      throw new Error(
        `Upstream server session expired (${msg}). The Learn-Topper and PW public proxy token must be renewed.`,
      );
    }
  } catch (e) {
    if ((e as Error).message?.includes("Upstream server session expired")) throw e;
  }

  // 3. If batch details failed, try direct Penpencil v3 API
  if (url.includes("/details")) {
    const match = url.match(/batches\/([^/]+)\/details/);
    if (match?.[1]) {
      try {
        const pwUrl = `https://api.penpencil.co/v3/batches/${match[1]}/details`;
        const res = await fetchWithTimeout(
          pwUrl,
          {
            headers: { "client-type": "WEB", "client-version": "1.0.0" },
          },
          7000,
        );
        if (res.ok) {
          const json = await res.json();
          return json as T;
        }
      } catch {
        // Fallback failed
      }
    }
  }

  throw new Error("Unable to fetch data from network or fallback endpoints.");
}

/**
 * Loads batches with instant in-memory & localStorage caching + multi-mirror fallback
 */
export async function fetchBatches(): Promise<Batch[]> {
  // 1. Return in-memory cache instantly if available
  if (memoryBatchesCache && memoryBatchesCache.length > 0) {
    return memoryBatchesCache;
  }

  // 2. Return localStorage cache if available
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(BATCHES_CACHE_KEY);
      const cachedTime = localStorage.getItem(BATCHES_CACHE_TIME_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Batch[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryBatchesCache = parsed;

          // If cache is not stale, return immediately
          const isFresh = cachedTime && Date.now() - Number(cachedTime) < CACHE_TTL_MS;
          if (isFresh) {
            return parsed;
          }

          // Otherwise, return cached immediately while updating in background
          refreshBatchesInBackground();
          return parsed;
        }
      }
    } catch {
      // Storage access error, continue to network
    }
  }

  // 3. Fetch from primary or backup sources
  return await fetchBatchesFromNetwork();
}

/** Helper to fetch and update batches in the background */
function refreshBatchesInBackground() {
  setTimeout(async () => {
    try {
      await fetchBatchesFromNetwork();
    } catch {
      // Silently ignore background refresh errors
    }
  }, 100);
}

interface RawBatchRecord {
  id?: string | number;
  _id?: string;
  batch_id?: string;
  name?: string;
  class?: string;
  byName?: string;
  cohort?: string;
  description?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  language?: string;
  medium?: string;
  photo?: string;
  previewImage?: string | { baseUrl?: string; key?: string };
  pngUrl?: string;
  feeTotal?: number;
  batch_type?: string;
  type?: string;
  slug?: string;
  status?: string;
  price?: Record<string, unknown>;
}

export function getBatchImageUrl(
  previewImage?: string | { baseUrl?: string; key?: string } | null,
): string | undefined {
  if (!previewImage) return undefined;
  if (typeof previewImage === "string") return previewImage;
  if (previewImage.key) {
    const base = previewImage.baseUrl || "https://static.pw.live/";
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    const normalizedKey = previewImage.key.startsWith("/")
      ? previewImage.key.slice(1)
      : previewImage.key;
    return `${normalizedBase}${normalizedKey}`;
  }
  return undefined;
}

/**
 * Fetch completed batches for the website from primary proxy or backup.
 * Endpoint: /v1/batches?page=1&limit=200
 */
async function fetchBatchesFromNetwork(): Promise<Batch[]> {
  // 1. Try primary Heroku proxy endpoint: /v1/batches?page=1&limit=200
  try {
    const res = await fetchWithTimeout(`${API_BASE}/v1/batches?page=1&limit=200`, {}, 8000);
    if (res.ok) {
      const json = (await res.json()) as {
        success?: boolean;
        total?: number;
        data?: RawBatchRecord[];
      };
      if (Array.isArray(json.data) && json.data.length > 0) {
        const list: Batch[] = json.data
          .filter((b) => Boolean(b && (b._id || b.batch_id || b.name)))
          .map((b) => ({
            _id: String(b._id || b.batch_id || b.id),
            name: String(b.name || "Untitled Batch"),
            class: b.class,
            slug: b.slug,
            byName: b.byName ?? b.cohort ?? b.description ?? "",
            startDate: b.startDate ?? b.start_date,
            endDate: b.endDate ?? b.end_date,
            language: b.language ?? b.medium ?? "Hinglish",
            previewImage: getBatchImageUrl(b.previewImage) ?? b.photo ?? b.pngUrl,
            feeTotal: typeof b.feeTotal === "number" ? b.feeTotal : undefined,
            type: b.type ?? b.batch_type ?? (b.class ? `Class ${b.class}` : undefined),
            status: b.status,
            price: b.price,
          }));

        if (list.length > 0) {
          saveBatchesToCache(list);
          return list;
        }
      }
    }
  } catch {
    // Network request error
  }

  // 2. Secondary fallback: static rarestudy batches.json
  try {
    const backupRes = await fetchWithTimeout(
      "https://rarestudy.github.io/rarestudy/batches.json",
      {},
      5000,
    );
    if (backupRes.ok) {
      const backupJson = (await backupRes.json()) as {
        success?: boolean;
        batches?: RawBatchRecord[];
      };
      const rawBatches = backupJson.batches;
      if (Array.isArray(rawBatches) && rawBatches.length > 0) {
        const list: Batch[] = rawBatches
          .filter((b) => Boolean(b && (b._id || b.batch_id || b.name)))
          .map((b) => ({
            _id: String(b._id || b.batch_id || b.id),
            name: String(b.name || "Untitled Batch"),
            class: b.class,
            slug: b.slug,
            byName: b.byName ?? b.cohort ?? b.description ?? "",
            startDate: b.startDate ?? b.start_date,
            endDate: b.endDate ?? b.end_date,
            language: b.language ?? b.medium ?? "Hinglish",
            previewImage: getBatchImageUrl(b.previewImage) ?? b.photo ?? b.pngUrl,
            feeTotal: typeof b.feeTotal === "number" ? b.feeTotal : undefined,
            type: b.type ?? b.batch_type ?? (b.class ? `Class ${b.class}` : undefined),
            status: b.status,
            price: b.price,
          }));

        if (list.length > 0) {
          saveBatchesToCache(list);
          return list;
        }
      }
    }
  } catch {
    // Backup request error
  }

  // If memory cache exists from before, use it as fallback
  if (memoryBatchesCache && memoryBatchesCache.length > 0) {
    return memoryBatchesCache;
  }

  throw new Error("Could not load batches list. Please check your internet connection and reload.");
}

function saveBatchesToCache(list: Batch[]) {
  memoryBatchesCache = list;
  if (typeof window !== "undefined") {
    try {
      const cacheSlice = list.slice(0, 800);
      localStorage.setItem(BATCHES_CACHE_KEY, JSON.stringify(cacheSlice));
      localStorage.setItem(BATCHES_CACHE_TIME_KEY, String(Date.now()));
    } catch {
      // Storage quota or privacy mode error - silently ignore
    }
  }
}

/** Fetches subjects for a batch: /v1/{batchId}/get-batch-subjects */
export async function fetchBatchSubjects(batchId: string): Promise<Subject[]> {
  try {
    const data = await getJSON<{ success?: boolean; data?: Subject[] }>(
      `${API_BASE}/v1/${batchId}/get-batch-subjects`,
    );
    if (Array.isArray(data?.data)) {
      return data.data.map((s) => ({
        ...s,
        subject: s.subject || s.subjectName || "Subject",
      }));
    }
  } catch {
    // Ignore and return empty
  }
  return [];
}

/** Fetches full batch details and subjects */
export async function fetchBatchDetails(batchId: string) {
  // 1. Try /v1/{batchId}/details first
  try {
    const data = await getJSON<{
      success?: boolean;
      data: Batch & { subjects?: Subject[]; description?: string };
    }>(`${API_BASE}/v1/${batchId}/details`);

    if (data?.data) {
      const batch = data.data;
      // If subjects missing in details, fetch via get-batch-subjects
      if (!batch.subjects || batch.subjects.length === 0) {
        batch.subjects = await fetchBatchSubjects(batchId);
      } else {
        batch.subjects = batch.subjects.map((s) => ({
          ...s,
          subject: s.subject || s.subjectName || "Subject",
        }));
      }
      return batch;
    }
  } catch {
    // Fall through to direct subjects fetch
  }

  // 2. Direct subjects fallback
  const subjects = await fetchBatchSubjects(batchId);
  return {
    _id: batchId,
    name: "Batch",
    subjects,
  };
}

/**
 * Normalizes content types for the Heroku proxy endpoint:
 * Videos -> videos
 * notes -> Notes
 * DppNotes -> dppNotes
 * Test -> Test
 */
export function normalizeContentType(type: ContentType): string {
  switch (type) {
    case "Videos":
      return "videos";
    case "notes":
      return "Notes";
    case "DppNotes":
      return "dppNotes";
    case "Test":
      return "Test";
    default:
      return type;
  }
}

/** Fetches topics/chapters for a subject: /v1/{batch_id}/subject/{subject_id}/topics?page=1 */
export async function fetchTopics(batchId: string, subjectId: string): Promise<Topic[]> {
  try {
    const data = await getJSON<{ success?: boolean; data?: Topic[] }>(
      `${API_BASE}/v1/${batchId}/subject/${subjectId}/topics?page=1`,
    );
    if (data?.data && data.data.length > 0) return data.data;
  } catch {
    // ignore
  }
  return [];
}

export async function fetchContent(
  batchId: string,
  subjectId: string,
  contentType: ContentType,
  tag?: string,
  page = 1,
): Promise<ContentItem[]> {
  const activeTag = tag ?? "all";
  const mappedType = normalizeContentType(contentType);

  try {
    const v1Url = `${API_BASE}/v1/${batchId}/subject/${subjectId}/contents?page=${page}&tag=${activeTag}&contentType=${mappedType}`;
    const res = await getJSON<{ success?: boolean; data?: ContentItem[] }>(v1Url);
    if (res?.data && res.data.length > 0) return res.data;
  } catch (e) {
    if ((e as Error).message?.includes("session expired")) throw e;
  }

  if (activeTag !== "all") {
    try {
      const allRes = await getJSON<{ success?: boolean; data?: ContentItem[] }>(
        `${API_BASE}/v1/${batchId}/subject/${subjectId}/contents?page=${page}&tag=all&contentType=${mappedType}`,
      );
      if (allRes?.data?.length) return allRes.data;
    } catch {
      // ignore
    }
  }

  return [];
}

/** Content for a topic: fast fetch with slug or topicId */
export async function fetchTopicContent(
  batchId: string,
  subjectId: string,
  contentType: ContentType,
  topicId: string,
  topicName?: string,
  topicSlug?: string,
): Promise<ContentItem[]> {
  const mappedType = normalizeContentType(contentType);
  const tagToUse = topicSlug || topicId;

  // 1. Try with slug or topicId
  try {
    const v1Url = `${API_BASE}/v1/${batchId}/subject/${subjectId}/contents?page=1&tag=${tagToUse}&contentType=${mappedType}`;
    const tagged = await getJSON<{ success?: boolean; data?: ContentItem[] }>(v1Url);
    if (tagged.data?.length) return dedupe(tagged.data);
  } catch (e) {
    if ((e as Error).message?.includes("session expired")) {
      throw e;
    }
  }

  // 2. If topicId was used and didn't match, or vice versa
  if (topicSlug && topicId !== topicSlug) {
    try {
      const v1Url = `${API_BASE}/v1/${batchId}/subject/${subjectId}/contents?page=1&tag=${topicId}&contentType=${mappedType}`;
      const tagged = await getJSON<{ success?: boolean; data?: ContentItem[] }>(v1Url);
      if (tagged.data?.length) return dedupe(tagged.data);
    } catch {
      // ignore
    }
  }

  // 3. Fallback: tag=all with client-side filtering
  try {
    const allRes = await getJSON<{ success?: boolean; data?: ContentItem[] }>(
      `${API_BASE}/v1/${batchId}/subject/${subjectId}/contents?page=1&tag=all&contentType=${mappedType}`,
    );
    if (allRes?.data?.length) {
      const matched = allRes.data.filter((i) =>
        i.tags?.some(
          (t) =>
            t._id === topicId ||
            (topicSlug && t._id === topicSlug) ||
            (topicName && t.name?.trim() === topicName.trim()),
        ),
      );
      if (matched.length) return dedupe(matched);
      return dedupe(allRes.data);
    }
  } catch (e) {
    if ((e as Error).message?.includes("session expired")) {
      throw e;
    }
  }

  return [];
}

function dedupe(items: ContentItem[]) {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i._id) ? false : (seen.add(i._id), true)));
}

export function attachmentUrl(a?: Attachment) {
  if (!a) return undefined;
  const direct = a.url || a.download_url || a.fileUrl;
  if (direct && /^https?:\/\//i.test(direct)) {
    return direct;
  }
  const key = a.key?.trim();
  if (!key) return undefined;
  if (/^https?:\/\//i.test(key)) return key;
  const base = (a.baseUrl ?? "https://static.pw.live/").trim();
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedKey = key.startsWith("/") ? key.slice(1) : key;
  return `${normalizedBase}${normalizedKey}`;
}

export function attachmentProxyUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const u = new URL(url);
      return `/api/public/stream/${u.host}${u.pathname}${u.search}`;
    } catch {
      return url;
    }
  }
  return url;
}

export function itemAttachments(item: ContentItem): {
  name: string;
  url: string;
  proxyUrl: string;
}[] {
  const out: { name: string; url: string; proxyUrl: string }[] = [];
  const seen = new Set<string>();

  const add = (name: string, url?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({
      name: name || "Attachment",
      url,
      proxyUrl: attachmentProxyUrl(url),
    });
  };

  for (const hw of item.homeworkIds ?? []) {
    for (const a of hw.attachmentIds ?? []) {
      add(a.name ?? hw.topic ?? "Class Notes", attachmentUrl(a));
    }
    const hwRecord = hw as Record<string, unknown>;
    const directHwUrl =
      typeof hwRecord["url"] === "string"
        ? (hwRecord["url"] as string)
        : typeof hwRecord["download_url"] === "string"
          ? (hwRecord["download_url"] as string)
          : typeof hwRecord["fileUrl"] === "string"
            ? (hwRecord["fileUrl"] as string)
            : undefined;
    if (directHwUrl && /^https?:\/\//i.test(directHwUrl)) {
      add(hw.topic ?? "Class Notes", directHwUrl);
    }
  }

  for (const a of item.attachmentIds ?? []) {
    add(a.name ?? item.topic ?? "Attachment", attachmentUrl(a));
  }

  return out;
}

export function subjectImage(s: Subject) {
  if (!s.imageId?.key) return undefined;
  return `${s.imageId.baseUrl ?? "https://static.pw.live/"}${s.imageId.key}`;
}

export function youtubeId(url?: string) {
  if (!url) return undefined;
  const m = url.match(/(?:embed\/|v=|youtu\.be\/|live\/)([\w-]{6,})/);
  return m?.[1];
}

/** Rewrites an absolute media URL to our same-origin streaming proxy (adds CORS + auth passthrough). */
export function proxyStream(absoluteUrl: string) {
  const u = new URL(absoluteUrl);
  return `/api/public/stream/${u.host}${u.pathname}${u.search}`;
}

export type Playback = {
  src: string;
  signedQuery?: string;
  isDirectMp4?: boolean;
  videoDetails?: VideoDetails;
};

export type VideoDetails = {
  _id: string;
  id?: string;
  name?: string;
  image?: string;
  duration?: string;
  status?: string;
  videoUrl?: string;
  types?: string[];
  description?: string;
};

const VIDEO_DETAILS_URL = "/api/public/video-url";

const toHls = (url: string) => url.replace(/\.mpd(\?|#|$)/i, ".m3u8$1");

export const PRIMARY_STREAM_HOST = `${API_BASE}/stream`;

/**
 * Fetches video metadata and direct S3 MP4 streaming URL by video ID:
 * GET /v1/videos/{videoId}
 */
export async function fetchVideoById(videoId: string): Promise<VideoDetails | null> {
  if (!videoId) return null;
  try {
    const res = await getJSON<{ success?: boolean; data?: VideoDetails }>(
      `${API_BASE}/v1/videos/${videoId}`,
    );
    if (res?.data && (res.data._id || res.data.videoUrl)) {
      const vid = { ...res.data };
      if (vid.videoUrl) {
        vid.videoUrl = vid.videoUrl.replace("https://a.pimaxer.in", API_BASE);
      }
      return vid;
    }
  } catch {
    /* fallback to local proxy */
    try {
      const res = await fetch(`${VIDEO_DETAILS_URL}?childId=${videoId}`);
      if (res.ok) {
        const json = (await res.json()) as { success?: boolean; data?: VideoDetails };
        if (json?.data?.videoUrl) {
          const vid = { ...json.data };
          if (vid.videoUrl) {
            vid.videoUrl = vid.videoUrl.replace("https://a.pimaxer.in", API_BASE);
          }
          return vid;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Extracts a video ID (UUID or alphanumeric ID) from a URL or ID string.
 */
export function extractVideoId(urlOrId?: string): string | undefined {
  if (!urlOrId) return undefined;
  const trimmed = urlOrId.trim();

  // If already a UUID
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
    return trimmed;
  }

  // Match UUID or ID right before /master.(m3u8|mpd) or /video.mp4
  const masterMatch = trimmed.match(
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-zA-Z0-9_-]{12,})\/(?:master\.(?:m3u8|mpd)|video\.mp4)/i,
  );
  if (masterMatch?.[1]) {
    return masterMatch[1];
  }

  // Match UUID in URL pathname
  const uuidMatch = trimmed.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if (uuidMatch?.[0]) {
    return uuidMatch[0];
  }

  return undefined;
}

/** Builds the ultra-fast MP4 stream URL on the Heroku proxy */
export function buildUltraFastMp4StreamUrl(streamUuid: string): string {
  return `${API_BASE}/stream/${streamUuid}/video.mp4`;
}

/** Builds the stream URL: https://stream.srv-1.pimaxer.in/{videoId}/master.m3u8 */
export function buildPimaxerStreamUrl(videoId: string): string {
  return `https://stream.srv-1.pimaxer.in/${videoId}/master.m3u8`;
}

/** Converts any direct CDN or manifest URL to the HLS format */
function mirrorHls(url?: string) {
  if (!url) return undefined;
  const videoId = extractVideoId(url);
  if (videoId) {
    return `https://stream.srv-1.pimaxer.in/${videoId}/master.m3u8`;
  }
  return undefined;
}

/**
 * Resolves the playback source URL:
 * 1) Queries /v1/videos/{lectureId} to get the direct Ultra-Fast S3 MP4 Proxy URL
 * 2) Resolves from video-url details proxy
 * 3) Fallback to player worker proxy
 * 4) Direct URL fallback
 */
export async function resolvePlayback(
  batchId: string,
  subjectId: string,
  lectureId: string,
  directUrl?: string,
): Promise<Playback | undefined> {
  // 1. Try resolving video details and direct MP4 URL from Heroku proxy: /v1/videos/{lectureId}
  const videoData = await fetchVideoById(lectureId);
  if (videoData?.videoUrl) {
    const streamUrl = videoData.videoUrl.replace("https://a.pimaxer.in", API_BASE);
    return {
      src: streamUrl,
      isDirectMp4: streamUrl.endsWith(".mp4") || streamUrl.includes("/stream/"),
      videoDetails: videoData,
    };
  }

  // 2. If directUrl is an MP4 or stream URL on pimaxer/heroku, normalize
  if (directUrl?.includes("/stream/") && directUrl.includes(".mp4")) {
    const cleanUrl = directUrl.replace("https://a.pimaxer.in", API_BASE);
    return { src: cleanUrl, isDirectMp4: true };
  }

  // 3. If directUrl contains a videoId, try querying video endpoint with that ID
  const directVideoId = extractVideoId(directUrl);
  if (directVideoId && directVideoId !== lectureId) {
    const directData = await fetchVideoById(directVideoId);
    if (directData?.videoUrl) {
      const streamUrl = directData.videoUrl.replace("https://a.pimaxer.in", API_BASE);
      return {
        src: streamUrl,
        isDirectMp4: streamUrl.endsWith(".mp4") || streamUrl.includes("/stream/"),
        videoDetails: directData,
      };
    }
  }

  // 4. Try resolving via local video-url details proxy
  try {
    const res = await fetch(`${VIDEO_DETAILS_URL}?parentId=${batchId}&childId=${lectureId}`);
    if (res.ok) {
      const json = (await res.json()) as {
        error?: string;
        data?: { url?: string; videoUrl?: string };
      };
      const raw = json?.data?.videoUrl || json?.data?.url;
      if (raw && !json.error) {
        const cleanRaw = raw.replace("https://a.pimaxer.in", API_BASE);
        return {
          src: cleanRaw,
          isDirectMp4: cleanRaw.endsWith(".mp4") || cleanRaw.includes("/stream/"),
        };
      }
    }
  } catch {
    /* fall through */
  }

  if (directUrl) {
    const cleanUrl = directUrl.replace("https://a.pimaxer.in", API_BASE);
    if (cleanUrl.endsWith(".mp4") || cleanUrl.includes("/stream/")) {
      return { src: cleanUrl, isDirectMp4: true };
    }
    return { src: proxyStream(toHls(directUrl)) };
  }
  return undefined;
}
