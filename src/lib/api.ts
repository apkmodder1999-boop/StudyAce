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
 * Loads all batches directly from the API.
 * Endpoint: http://a.pimaxer.in/v1/batches?limit=0
 */
export async function fetchBatches(): Promise<Batch[]> {
  if (memoryBatchesCache && memoryBatchesCache.length > 0) {
    return memoryBatchesCache;
  }
  return fetchBatchesFromNetwork();
}

async function fetchBatchesFromNetwork(): Promise<Batch[]> {
  try {
    let rawBatches: Record<string, unknown>[] = [];

    // Query with limit=0 to get ALL batches in a single fast call
    const firstRes = await getJSON<{
      success?: boolean;
      total?: number;
      data?: Record<string, unknown>[];
    }>(`${API_BASE}/v1/batches?limit=0`);

    if (Array.isArray(firstRes.data) && firstRes.data.length > 0) {
      rawBatches = firstRes.data;
    }

    // In case limit=0 was paginated upstream, fetch remaining pages to get 100% of batches
    const total = firstRes.total ?? rawBatches.length;
    if (rawBatches.length < total) {
      let page = 2;
      while (rawBatches.length < total && page <= 10) {
        try {
          const nextRes = await getJSON<{
            data?: Record<string, unknown>[];
          }>(`${API_BASE}/v1/batches?page=${page}&limit=100`);
          if (!nextRes.data || nextRes.data.length === 0) break;
          rawBatches.push(...nextRes.data);
          page++;
        } catch {
          break;
        }
      }
    }

    // Deduplicate by ID and map
    const seen = new Set<string>();
    const list: Batch[] = [];

    for (const b of rawBatches) {
      const id = String(b["_id"] || b["batch_id"] || b["id"]);
      if (!id || seen.has(id)) continue;
      seen.add(id);

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
        price: typeof b["price"] === "object" ? (b["price"] as Record<string, unknown>) : undefined,
      });
    }

    if (list.length > 0) {
      memoryBatchesCache = list;
      return list;
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

/** Normalizes stream URL for active page protocol */
export function normalizeStreamUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  let res = url.trim();
  if (res.startsWith("/stream/")) {
    res = `${API_BASE}${res}`;
  }
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    res.startsWith("http://a.pimaxer.in")
  ) {
    res = res.replace("http://a.pimaxer.in", "https://a.pimaxer.in");
  }
  return res;
}

/**
 * Direct Video Stream & Metadata Query
 * Endpoint: http://a.pimaxer.in/v1/videos/{videoId}
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
        vid.videoUrl = normalizeStreamUrl(vid.videoUrl);
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
