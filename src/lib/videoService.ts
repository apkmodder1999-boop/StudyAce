export interface ContentItem {
  _id: string; // ✅ UPAR WALI ID (Primary Lecture ID)
  topic?: string;
  name?: string;
  url?: string;
  startTime?: string;
  status?: string;
  videoDetails?: {
    _id?: string; // ❌ Niche wali ID (Ise childId me NAHI dalna)
    id?: string;
    name?: string;
    image?: string;
    videoUrl?: string;
    duration?: string;
  };
  attachments?: Record<string, unknown>[];
  homeworkIds?: Record<string, unknown>[];
}

export interface VideoStreamResponse {
  success: boolean;
  streamUrl: string;
  title?: string;
  duration?: string;
  image?: string;
  raw?: Record<string, unknown>;
}

/**
 * PW Lecture Video Stream Fetcher
 *
 * @param batchId - Batch ki ID (parentId & batchId query param)
 * @param lectureItem - Contents array ka item jisme se UPAR WALI _id li jaati hai
 * @param userToken - Optional Auth token agar required ho
 */
export async function getLectureVideoStream(
  batchId: string,
  lectureItem: ContentItem,
  userToken?: string,
): Promise<VideoStreamResponse> {
  // 1. RULE: Hamesha UPAR WALI ID (lectureItem._id) use karni hai
  const childId = lectureItem._id;

  if (!childId) {
    throw new Error("Missing top-level lecture _id!");
  }

  // 2. Official URL endpoint with parentId, childId and batchId
  const endpoint = `https://a.pimaxer.in/v1/video-url-details?parentId=${batchId}&childId=${childId}&batchId=${batchId}`;

  // 3. Headers (Handling browser safe headers & server/Node headers)
  const isBrowser = typeof window !== "undefined";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (!isBrowser) {
    headers["Client-Type"] = "WEB";
    headers["Referer"] = "https://peedablu.com/";
    headers["Origin"] = "https://peedablu.com";
    headers["User-Agent"] =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  }

  const token =
    userToken ||
    (isBrowser
      ? localStorage.getItem("pw_auth_token") ||
        localStorage.getItem("pimaxer_token") ||
        localStorage.getItem("token")
      : undefined);

  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  try {
    // 4. API Call
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      const json = await response.json();
      const data = (json?.data || json) as Record<string, unknown>;

      // 5. Extract stream URL (.mp4 ya .m3u8)
      const rawUrl =
        (typeof data["videoUrl"] === "string" ? data["videoUrl"] : "") ||
        (typeof data["url"] === "string" ? data["url"] : "") ||
        (typeof data["streamUrl"] === "string" ? data["streamUrl"] : "") ||
        (typeof (data["videoDetails"] as Record<string, unknown>)?.["videoUrl"] === "string"
          ? ((data["videoDetails"] as Record<string, unknown>)["videoUrl"] as string)
          : "");

      if (rawUrl) {
        // Normalize stream URL to HTTPS a.pimaxer.in
        let finalUrl = rawUrl.trim();
        if (finalUrl.startsWith("/stream/")) {
          finalUrl = `https://a.pimaxer.in${finalUrl}`;
        } else if (finalUrl.startsWith("http://a.pimaxer.in/")) {
          finalUrl = finalUrl.replace("http://a.pimaxer.in/", "https://a.pimaxer.in/");
        }

        return {
          success: true,
          streamUrl: finalUrl,
          title:
            lectureItem.topic ||
            (typeof data["name"] === "string" ? data["name"] : undefined) ||
            lectureItem.name,
          duration:
            (typeof data["duration"] === "string" ? data["duration"] : undefined) ||
            lectureItem.videoDetails?.duration,
          image:
            (typeof data["image"] === "string" ? data["image"] : undefined) ||
            lectureItem.videoDetails?.image,
          raw: data,
        };
      }
    }
  } catch (err) {
    console.warn(`[getLectureVideoStream] video-url-details failed for childId ${childId}:`, err);
  }

  // Direct MP4 fallback using bottom video ID (from lectureItem.videoDetails._id or lectureItem.url)
  const bottomId =
    lectureItem.videoDetails?._id ||
    lectureItem.videoDetails?.id ||
    (lectureItem.url && lectureItem.url.match(/stream\/([a-f0-9]{24})/i)?.[1]);

  if (lectureItem.videoDetails?.videoUrl) {
    return {
      success: true,
      streamUrl: lectureItem.videoDetails.videoUrl,
      title: lectureItem.topic || lectureItem.videoDetails?.name || lectureItem.name,
      duration: lectureItem.videoDetails?.duration,
      image: lectureItem.videoDetails?.image,
    };
  }

  if (bottomId) {
    return {
      success: true,
      streamUrl: `https://a.pimaxer.in/stream/${bottomId}/video.mp4`,
      title: lectureItem.topic || lectureItem.videoDetails?.name || lectureItem.name,
      duration: lectureItem.videoDetails?.duration,
      image: lectureItem.videoDetails?.image,
    };
  }

  if (lectureItem.url && /^https?:\/\//i.test(lectureItem.url)) {
    return {
      success: true,
      streamUrl: lectureItem.url,
      title: lectureItem.topic || lectureItem.name,
    };
  }

  throw new Error(`Failed to resolve stream for lecture: ${childId}`);
}
