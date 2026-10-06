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
        types?: string[] | undefined;
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

export type VideoDetails = {
  _id?: string | undefined;
  id?: string | undefined;
  name?: string | undefined;
  image?: string | undefined;
  videoUrl?: string | undefined;
  duration?: string | undefined;
  types?: string[] | undefined;
  description?: string | undefined;
  status?: string | undefined;
};

export const CONTENT_TYPES = ["Videos", "notes", "DppNotes", "Test"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

const BATCHES_CACHE_KEY = "pw_batches_cached_list_v1";
let memoryBatchesCache: Batch[] | null = null;

/** Direct fetch with timeout — no server proxy, directly visible in Network tab */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000,
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

/** Direct JSON getter with error handling */
async function getJSON<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url, {
    headers: {
      accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Resolves batch preview image URL */
export function getBatchImageUrl(previewImage: unknown): string | undefined {
  if (!previewImage) return undefined;
  if (typeof previewImage === "string") return previewImage;
  if (typeof previewImage === "object") {
    const p = previewImage as Record<string, unknown>;
    if (typeof p["url"] === "string") return p["url"];
    if (typeof p["baseUrl"] === "string" && typeof p["key"] === "string") {
      return `${p["baseUrl"]}${p["key"]}`;
    }
  }
  return undefined;
}

/** Resolves subject cover image URL */
export function subjectImage(subject: Subject): string | undefined {
  if (subject.imageId?.baseUrl && subject.imageId?.key) {
    return `${subject.imageId.baseUrl}${subject.imageId.key}`;
  }
  return undefined;
}

/**
 * Loads batches directly from the public API (visible in DevTools Network tab).
 * Endpoint: https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com/v1/batches?page=1&limit=200
 */
export async function fetchBatches(): Promise<Batch[]> {
  if (memoryBatchesCache && memoryBatchesCache.length > 0) {
    return memoryBatchesCache;
  }

  try {
    const local = localStorage.getItem(BATCHES_CACHE_KEY);
    if (local) {
      const parsed = JSON.parse(local) as Batch[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryBatchesCache = parsed;
        // Re-validate in background
        fetchBatchesFromNetwork().catch(() => {});
        return parsed;
      }
    }
  } catch {
    // localStorage not accessible
  }

  return fetchBatchesFromNetwork();
}

async function fetchBatchesFromNetwork(): Promise<Batch[]> {
  try {
    const json = await getJSON<{
      success?: boolean;
      total?: number;
      data?: Record<string, unknown>[];
    }>(`${API_BASE}/v1/batches?page=1&limit=200`);

    if (Array.isArray(json.data) && json.data.length > 0) {
      const list: Batch[] = json.data
        .filter((b) => Boolean(b && (b["_id"] || b["batch_id"] || b["name"])))
        .map((b) => ({
          _id: String(b["_id"] || b["batch_id"] || b["id"]),
          name: String(b["name"] || "Untitled Batch"),
          class: typeof b["class"] === "string" ? b["class"] : undefined,
          slug: typeof b["slug"] === "string" ? b["slug"] : undefined,
          byName: String(b["byName"] || b["cohort"] || b["description"] || ""),
          startDate: typeof b["startDate"] === "string" ? b["startDate"] : undefined,
          endDate: typeof b["endDate"] === "string" ? b["endDate"] : undefined,
          language: String(b["language"] || b["medium"] || "Hinglish"),
          previewImage: getBatchImageUrl(b["previewImage"]) || (b["photo"] as string) || undefined,
          feeTotal: typeof b["feeTotal"] === "number" ? b["feeTotal"] : undefined,
          type: String(b["type"] || b["batch_type"] || (b["class"] ? `Class ${b["class"]}` : "")),
          status: typeof b["status"] === "string" ? b["status"] : undefined,
          price:
            typeof b["price"] === "object" ? (b["price"] as Record<string, unknown>) : undefined,
        }));

      if (list.length > 0) {
        memoryBatchesCache = list;
        try {
          localStorage.setItem(BATCHES_CACHE_KEY, JSON.stringify(list));
        } catch {
          // ignore
        }
        return list;
      }
    }
  } catch (err) {
    if (memoryBatchesCache && memoryBatchesCache.length > 0) {
      return memoryBatchesCache;
    }
    throw err;
  }

  if (memoryBatchesCache && memoryBatchesCache.length > 0) {
    return memoryBatchesCache;
  }

  throw new Error("Could not load batches list from API. Please verify your internet connection.");
}

/**
 * Direct Batch Details Fetch
 * Endpoint: https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com/v1/{batchId}/details
 */
export async function fetchBatchDetails(batchId: string): Promise<{
  _id: string;
  name: string;
  subjects: Subject[];
  batchName?: string;
  byName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  previewImage?: unknown;
}> {
  try {
    const json = await getJSON<{
      success?: boolean;
      data?: {
        _id: string;
        name: string;
        subjects?: Subject[];
        batchName?: string;
        byName?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        previewImage?: unknown;
      };
    }>(`${API_BASE}/v1/${batchId}/details`);

    if (json?.data) {
      return {
        _id: json.data._id || batchId,
        name: json.data.name || json.data.batchName || "Batch",
        subjects: json.data.subjects ?? [],
        batchName: json.data.batchName,
        byName: json.data.byName,
        description: json.data.description,
        startDate: json.data.startDate,
        endDate: json.data.endDate,
        previewImage: json.data.previewImage,
      };
    }
  } catch {
    // Fallback to Penpencil v3 API directly
    const pwJson = await getJSON<{
      data?: {
        _id: string;
        name: string;
        subjects?: Subject[];
      };
    }>(`https://api.penpencil.co/v3/batches/${batchId}/details`);

    if (pwJson?.data) {
      return {
        _id: pwJson.data._id || batchId,
        name: pwJson.data.name || "Batch",
        subjects: pwJson.data.subjects ?? [],
      };
    }
  }

  throw new Error("Unable to fetch batch subjects.");
}

/**
 * Direct Topics Fetch
 * Endpoint: https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com/v1/{batchId}/subject/{subjectId}/topics?page=1
 */
export async function fetchTopics(batchId: string, subjectId: string): Promise<Topic[]> {
  const json = await getJSON<{
    success?: boolean;
    data?: Topic[];
  }>(`${API_BASE}/v1/${batchId}/subject/${subjectId}/topics?page=1`);

  return Array.isArray(json?.data) ? json.data : [];
}

/**
 * Direct Content Fetch (Videos, notes, DPPs, tests)
 * Endpoint: https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com/v1/{batchId}/subject/{subjectId}/contents?page=1&tag={topicId}&contentType={contentType}
 */
export async function fetchContent(
  batchId: string,
  subjectId: string,
  contentType: ContentType,
  topicId?: string,
  page = 1,
): Promise<ContentItem[]> {
  let url = `${API_BASE}/v1/${batchId}/subject/${subjectId}/contents?page=${page}&contentType=${contentType}`;
  if (topicId) {
    url += `&tag=${topicId}`;
  }

  const json = await getJSON<{
    success?: boolean;
    data?: ContentItem[];
  }>(url);

  return Array.isArray(json?.data) ? json.data : [];
}

/**
 * Direct Topic Content Fetch
 */
export async function fetchTopicContent(
  batchId: string,
  subjectId: string,
  contentType: ContentType,
  topicId: string,
  _topicName?: string,
  _topicSlug?: string,
): Promise<ContentItem[]> {
  return fetchContent(batchId, subjectId, contentType, topicId, 1);
}

/**
 * Direct Video Stream & Metadata Query
 * Endpoint: https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com/v1/videos/{videoId}
 */
export async function fetchVideoById(videoId: string): Promise<VideoDetails | null> {
  if (!videoId) return null;
  try {
    const json = await getJSON<{
      success?: boolean;
      data?: VideoDetails;
    }>(`${API_BASE}/v1/videos/${videoId}`);

    if (json?.data && (json.data.videoUrl || json.data._id || json.data.id)) {
      const vid: VideoDetails = { ...json.data };
      if (vid.videoUrl) {
        // Upstream returns https://a.pimaxer.in/stream/... which is served by Heroku proxy:
        // https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com/stream/{uuid}/video.mp4
        vid.videoUrl = vid.videoUrl.replace(/https?:\/\/a\.pimaxer\.in/gi, API_BASE);
        if (vid.videoUrl.startsWith("/stream/")) {
          vid.videoUrl = `${API_BASE}${vid.videoUrl}`;
        }
      }
      return vid;
    }
  } catch {
    // endpoint returned 404 or video not ready
  }
  return null;
}

/** Extracts an ID or alphanumeric UUID from a URL */
export function extractVideoId(str?: string | null): string | null {
  if (!str) return null;
  const match = str.match(/([a-f0-9]{24})/i);
  return match ? match[1] : null;
}

/**
 * Resolves direct playback URL directly from video APIs without proxying
 */
export async function resolvePlayback(
  _batchId: string,
  _subjectId: string,
  lectureId: string,
  directUrl?: string | null,
): Promise<{ src: string; isDirectMp4?: boolean; videoDetails?: VideoDetails } | null> {
  // 1. Direct query to video details
  const videoData = await fetchVideoById(lectureId);
  if (videoData?.videoUrl) {
    return {
      src: videoData.videoUrl,
      isDirectMp4: videoData.videoUrl.endsWith(".mp4") || videoData.videoUrl.includes("/stream/"),
      videoDetails: videoData,
    };
  }

  // 2. Extracted video ID from directUrl
  const extractedId = extractVideoId(directUrl);
  if (extractedId && extractedId !== lectureId) {
    const extractedData = await fetchVideoById(extractedId);
    if (extractedData?.videoUrl) {
      return {
        src: extractedData.videoUrl,
        isDirectMp4:
          extractedData.videoUrl.endsWith(".mp4") || extractedData.videoUrl.includes("/stream/"),
        videoDetails: extractedData,
      };
    }
  }

  // 3. Direct URL fallback
  if (directUrl && /^https?:\/\//i.test(directUrl)) {
    let cleanUrl = directUrl.replace(/https?:\/\/a\.pimaxer\.in/gi, API_BASE);
    if (cleanUrl.startsWith("/stream/")) {
      cleanUrl = `${API_BASE}${cleanUrl}`;
    }
    return {
      src: cleanUrl,
      isDirectMp4: cleanUrl.endsWith(".mp4") || cleanUrl.includes("/stream/"),
    };
  }

  return null;
}

/** Direct attachment URL resolver without proxying */
export function attachmentUrl(a: Attachment): string | null {
  const direct = a.url || a.download_url || a.fileUrl;
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  if (a.baseUrl && a.key) return `${a.baseUrl}${a.key}`;
  return null;
}

/** Direct stream passthrough (no proxy) */
export function proxyStream(url: string): string {
  return url;
}

/** Direct attachment passthrough (no proxy) */
export function attachmentProxyUrl(url: string): string {
  return url;
}

/** Extracts all attachments from a content item */
export function itemAttachments(item: ContentItem): { name: string; url: string }[] {
  const out: { name: string; url: string }[] = [];

  for (const a of item.attachmentIds ?? []) {
    const url = attachmentUrl(a);
    if (url) out.push({ name: a.name ?? "Document", url });
  }

  for (const hw of item.homeworkIds ?? []) {
    for (const a of hw.attachmentIds ?? []) {
      const url = attachmentUrl(a);
      if (url) out.push({ name: a.name ?? hw.topic ?? "Document", url });
    }
  }

  return out;
}
