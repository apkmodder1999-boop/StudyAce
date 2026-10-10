export const API_BASE = "http://a.pimaxer.in";

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
  startTime?: string | undefined;
  duration?: string | undefined;
  totalQuestions?: number | undefined;
  totalMarks?: number | undefined;
  maxDuration?: number | undefined;
  modeType?: string | undefined;
  infoMessage?: string | undefined;
  tag2?: string | undefined;
  isVideoLecture?: boolean | undefined;
  attachments?: Attachment[] | undefined;
  attachmentIds?: Attachment[] | undefined;
  videoDetails?:
    | {
        _id?: string | undefined;
        id?: string | undefined;
        name?: string | undefined;
        image?: string | undefined;
        videoUrl?: string | undefined;
        duration?: string | undefined;
        status?: string | undefined;
        types?: string[] | undefined;
      }
    | undefined;
  homeworkIds?:
    | {
        _id?: string | undefined;
        topic?: string | undefined;
        note?: string | undefined;
        attachmentIds?: Attachment[] | undefined;
        url?: string | undefined;
        download_url?: string | undefined;
        fileUrl?: string | undefined;
      }[]
    | undefined;
};

export type ContentType = "Videos" | "notes" | "DppNotes" | "Test";

export type VideoDetails = {
  _id: string;
  id?: string;
  name?: string;
  videoUrl?: string;
  duration?: string;
  status?: string;
  image?: string;
  types?: string[];
};

/** In-memory cache for fast responsive navigation */
let memoryBatchesCache: Batch[] | null = null;
const BATCHES_CACHE_KEY = "pw_batches_cache_v2";

/** Safe Fetch Helper with Timeout */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/** Direct JSON getter with error handling and secure HTTPS protocol normalization */
async function getJSON<T>(url: string): Promise<T> {
  let targetUrl = url;
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    targetUrl.startsWith("http://a.pimaxer.in")
  ) {
    targetUrl = targetUrl.replace("http://a.pimaxer.in", "https://a.pimaxer.in");
  }
  const res = await fetchWithTimeout(targetUrl, {
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
 * Loads all batches up-front with limit=200 and parallel pagination.
 * Endpoint: http://a.pimaxer.in/v1/batches?page=1&limit=200
 * Automatically calculates total pages and fetches all batches up-front so that
 * all batches (including page 2, CTET, etc.) are available for instant search and browsing.
 */
export async function fetchBatches(): Promise<Batch[]> {
  // 1. Fast in-memory cache check
  if (memoryBatchesCache && memoryBatchesCache.length > 0) {
    return memoryBatchesCache;
  }

  // 2. Fast client localStorage cache check (instant render)
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("pw_batches_all_v2");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryBatchesCache = parsed;
          // Revalidate in background asynchronously
          fetchBatchesFromNetwork().catch(() => {});
          return parsed;
        }
      }
    } catch {
      // ignore storage access errors
    }
  }

  return fetchBatchesFromNetwork();
}

async function fetchBatchesFromNetwork(): Promise<Batch[]> {
  try {
    // Step 1: Fetch Page 1 with limit=200
    const page1 = await getJSON<{
      success?: boolean;
      total?: number;
      page?: number;
      limit?: number;
      data?: Record<string, unknown>[];
    }>(`${API_BASE}/v1/batches?page=1&limit=200`);

    const rawList: Record<string, unknown>[] = Array.isArray(page1.data) ? [...page1.data] : [];
    const total = typeof page1.total === "number" ? page1.total : rawList.length;
    const limit = typeof page1.limit === "number" && page1.limit > 0 ? page1.limit : 200;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Step 2: Fetch all remaining pages in parallel if more than 1 page
    if (totalPages > 1) {
      const remainingPromises: Promise<{ data?: Record<string, unknown>[] }>[] = [];
      for (let p = 2; p <= totalPages; p++) {
        remainingPromises.push(
          getJSON<{ data?: Record<string, unknown>[] }>(
            `${API_BASE}/v1/batches?page=${p}&limit=200`,
          ).catch((err) => {
            console.warn(`[Batches] Failed to fetch page ${p}:`, err);
            return { data: [] };
          }),
        );
      }

      const results = await Promise.all(remainingPromises);
      for (const res of results) {
        if (Array.isArray(res?.data)) {
          rawList.push(...res.data);
        }
      }
    }

    if (rawList.length > 0) {
      // Deduplicate by batch ID
      const seenIds = new Set<string>();
      const list: Batch[] = [];

      for (const b of rawList) {
        if (!b) continue;
        const id = String(b["_id"] || b["batch_id"] || b["id"] || "");
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        list.push({
          _id: id,
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
        });
      }

      if (list.length > 0) {
        memoryBatchesCache = list;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("pw_batches_all_v2", JSON.stringify(list));
          } catch {
            // ignore quota errors
          }
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
 * Endpoint: http://a.pimaxer.in/v1/{batchId}/details
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
        batchName?: string;
        byName?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        previewImage?: unknown;
      };
    }>(`https://api.penpencil.co/v3/batches/${batchId}/details`);

    if (pwJson?.data) {
      return {
        _id: pwJson.data._id || batchId,
        name: pwJson.data.name || pwJson.data.batchName || "Batch",
        subjects: pwJson.data.subjects ?? [],
        batchName: pwJson.data.batchName,
        byName: pwJson.data.byName,
        description: pwJson.data.description,
        startDate: pwJson.data.startDate,
        endDate: pwJson.data.endDate,
        previewImage: pwJson.data.previewImage,
      };
    }
  }

  return {
    _id: batchId,
    name: "Batch",
    subjects: [],
  };
}

/**
 * Direct Topics Fetch
 * Endpoint: http://a.pimaxer.in/v1/{batchId}/subject/{subjectId}/topics?page=1
 */
export async function fetchTopics(batchId: string, subjectId: string): Promise<Topic[]> {
  const json = await getJSON<{
    success?: boolean;
    data?: Topic[];
  }>(`${API_BASE}/v1/${batchId}/subject/${subjectId}/topics?page=1`);

  return Array.isArray(json?.data) ? json.data : [];
}

/**
 * Direct Content Fetch
 * Endpoint: http://a.pimaxer.in/v1/{batchId}/subject/{subjectId}/contents?page=1&tag={topicId}&contentType={contentType}
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

export const PROXY_STREAM_BASE = "https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com";

/** Normalizes stream URL for active page protocol and uses pw-api-proxy per user instruction */
export function normalizeStreamUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  let res = url.trim();
  if (res.startsWith("/stream/")) {
    res = `${PROXY_STREAM_BASE}${res}`;
  }
  // User instruction: "BUT INSTEAD OF a.pimaxer.in we will use pw-api-proxy-v1-dc90b930c4fa.herokuapp.com"
  if (res.includes("a.pimaxer.in/stream/")) {
    res = res.replace(/https?:\/\/a\.pimaxer\.in\/stream\//i, `${PROXY_STREAM_BASE}/stream/`);
  }
  return res;
}

/** Provides alternate stream mirror if primary stream fails */
export function getAlternateStreamUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.includes("pw-api-proxy-v1-dc90b930c4fa.herokuapp.com/stream/")) {
    return url.replace(
      "https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com/stream/",
      "https://a.pimaxer.in/stream/",
    );
  }
  if (url.includes("a.pimaxer.in/stream/")) {
    return url.replace(/https?:\/\/a\.pimaxer\.in\/stream\//i, `${PROXY_STREAM_BASE}/stream/`);
  }
  return undefined;
}

/**
 * Direct Video Stream & Metadata Query
 * Tries a.pimaxer.in first, then pw-api-proxy
 */
export async function fetchVideoById(videoId: string): Promise<VideoDetails | null> {
  if (!videoId) return null;
  // 1. Try a.pimaxer.in
  try {
    const json = await getJSON<{
      success?: boolean;
      data?: VideoDetails;
    }>(`${API_BASE}/v1/videos/${videoId}`);

    if (json?.data && (json.data.videoUrl || json.data._id || json.data.id)) {
      const vid: VideoDetails = { ...json.data };
      if (vid.videoUrl) {
        vid.videoUrl = normalizeStreamUrl(vid.videoUrl);
      }
      return vid;
    }
  } catch {
    // endpoint returned 404 or video not ready
  }

  // 2. Fallback to pw-api-proxy
  try {
    const json = await getJSON<{
      success?: boolean;
      data?: VideoDetails;
    }>(`${PROXY_STREAM_BASE}/v1/videos/${videoId}`);

    if (json?.data && (json.data.videoUrl || json.data._id || json.data.id)) {
      const vid: VideoDetails = { ...json.data };
      if (vid.videoUrl) {
        vid.videoUrl = normalizeStreamUrl(vid.videoUrl);
      }
      return vid;
    }
  } catch {
    // ignore
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
    const cleanUrl = normalizeStreamUrl(directUrl) || directUrl;
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

/** Extracts all available attachments from a content item */
export function itemAttachments(item: ContentItem): Attachment[] {
  const result: Attachment[] = [];
  if (Array.isArray(item.attachments)) {
    for (const a of item.attachments) {
      if (a && (a.url || a.download_url || a.fileUrl || a.key)) {
        result.push(a);
      }
    }
  }
  if (Array.isArray(item.attachmentIds)) {
    for (const a of item.attachmentIds) {
      if (a && (a.url || a.download_url || a.fileUrl || a.key)) {
        result.push(a);
      }
    }
  }
  return result;
}
