import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Loader2,
  FileText,
  Download,
  ArrowLeft,
  Zap,
  RotateCcw,
  RotateCw,
  Video,
  ExternalLink,
} from "lucide-react";
import {
  API_BASE,
  fetchContent,
  fetchVideoById,
  itemAttachments,
  proxyStream,
  resolvePlayback,
  extractVideoId,
  type ContentItem,
} from "@/lib/api";
import { Shell, Crumbs, ErrorBox } from "@/components/shell";

export const Route = createFileRoute(
  "/batches/$batchId/subject/$subjectId/topic/$topicId/lecture/$lectureId",
)({
  head: () => ({
    meta: [
      { title: "Watch Lecture — Study Ace" },
      {
        name: "description",
        content: "Stream the video lecture in high-definition with Study Ace player.",
      },
      { property: "og:title", content: "Watch Lecture — Study Ace" },
      {
        property: "og:description",
        content: "Stream the video lecture in high-definition with Study Ace player.",
      },
    ],
  }),
  component: LecturePage,
});

function LecturePage() {
  const { batchId, subjectId, topicId, lectureId } = Route.useParams();

  // 1. Fetch item from content pages
  const {
    data: itemData,
    isLoading: itemLoading,
    error: itemError,
  } = useQuery({
    queryKey: ["lecture-item", batchId, subjectId, topicId, lectureId],
    queryFn: async () => {
      const pages = await Promise.all([
        fetchContent(batchId, subjectId, "Videos", topicId, 1),
        fetchContent(batchId, subjectId, "Videos", undefined, 1),
        fetchContent(batchId, subjectId, "Videos", undefined, 2),
      ]);
      const all = pages.flat();
      return all.find((i) => i._id === lectureId) ?? null;
    },
  });

  // 2. Query direct S3 MP4 stream from Heroku proxy: /v1/videos/{id}
  const { data: videoData, isLoading: videoLoading } = useQuery({
    queryKey: ["lecture-video-stream", lectureId, itemData?.videoDetails?._id],
    queryFn: async () => {
      // 1. Try itemData.videoDetails._id or id if available
      const nestedId = itemData?.videoDetails?._id || itemData?.videoDetails?.id;
      if (nestedId) {
        const vNested = await fetchVideoById(nestedId);
        if (vNested?.videoUrl) return vNested;
      }

      // 2. Try lectureId
      const vDirect = await fetchVideoById(lectureId);
      if (vDirect?.videoUrl) return vDirect;

      // 3. Try videoId extracted from itemData?.url or itemData?.videoDetails?.videoUrl
      const extractedId =
        extractVideoId(itemData?.url) || extractVideoId(itemData?.videoDetails?.videoUrl);
      if (extractedId && extractedId !== lectureId && extractedId !== nestedId) {
        const vExtracted = await fetchVideoById(extractedId);
        if (vExtracted?.videoUrl) return vExtracted;
      }

      // 4. Fallback to resolvePlayback
      const playback = await resolvePlayback(
        batchId,
        subjectId,
        lectureId,
        itemData?.videoDetails?.videoUrl || itemData?.url,
      );
      if (playback?.src) {
        return {
          _id: lectureId,
          videoUrl: playback.src,
          name: itemData?.topic || itemData?.name,
          duration: itemData?.videoDetails?.duration,
          image: itemData?.videoDetails?.image,
        };
      }

      return null;
    },
    enabled: true,
  });

  const isLoading = itemLoading && videoLoading;

  return (
    <Shell>
      <Crumbs
        items={[
          {
            label: "Batches",
            to: (
              <Link to="/" className="hover:text-foreground">
                Batches
              </Link>
            ),
          },
          {
            label: "Chapter",
            to: (
              <Link
                to="/batches/$batchId/subject/$subjectId/topic/$topicId"
                params={{ batchId, subjectId, topicId }}
                search={{ name: undefined, slug: undefined }}
                className="hover:text-foreground"
              >
                Chapter
              </Link>
            ),
          },
          { label: "Lecture" },
        ]}
      />

      {isLoading && (
        <div className="card-surface aspect-video w-full flex flex-col items-center justify-center gap-3 bg-surface p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading video stream details…</p>
        </div>
      )}

      {itemError && <ErrorBox message={(itemError as Error).message} />}

      {!isLoading && (
        <LecturePlayerView
          item={itemData ?? { _id: lectureId }}
          videoData={videoData}
          batchId={batchId}
          subjectId={subjectId}
          topicId={topicId}
          lectureId={lectureId}
        />
      )}
    </Shell>
  );
}

function LecturePlayerView({
  item,
  videoData,
  batchId,
  subjectId,
  topicId,
  lectureId,
}: {
  item: ContentItem;
  videoData:
    | {
        videoUrl?: string | undefined;
        name?: string | undefined;
        image?: string | undefined;
        duration?: string | undefined;
        types?: string[] | undefined;
      }
    | null
    | undefined;
  batchId: string;
  subjectId: string;
  topicId: string;
  lectureId: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const files = itemAttachments(item);
  const title =
    videoData?.name || item.topic || item.videoDetails?.name || item.name || "Lecture Video";
  const duration = videoData?.duration || item.videoDetails?.duration;
  const thumb = videoData?.image || item.videoDetails?.image;

  // Resolve best stream URL
  const rawStreamUrl =
    videoData?.videoUrl ||
    (item.videoDetails?.videoUrl?.includes(".mp4")
      ? item.videoDetails.videoUrl.replace("https://a.pimaxer.in", API_BASE)
      : undefined) ||
    item.url;

  const streamUrl = rawStreamUrl
    ? rawStreamUrl.replace("https://a.pimaxer.in", API_BASE)
    : undefined;

  const isDirectMp4 = Boolean(
    streamUrl && (streamUrl.includes(".mp4") || streamUrl.includes("/stream/")),
  );

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize playback via native HTML5 video or HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Handle direct MP4 playback
    if (isDirectMp4 || streamUrl.endsWith(".mp4")) {
      video.src = streamUrl;
      video.load();
      return;
    }

    // Handle HLS stream (.m3u8 / .mpd)
    const hlsSource = streamUrl.replace(/\.mpd(\?|#|$)/i, ".m3u8$1");
    const proxiedHls = hlsSource.startsWith("http") ? proxyStream(hlsSource) : hlsSource;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(proxiedHls);
      hls.attachMedia(video);
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = proxiedHls;
      video.load();
    } else {
      video.src = streamUrl;
      video.load();
    }
  }, [streamUrl, isDirectMp4]);

  const handleSeek = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(
      0,
      Math.min(video.duration || 0, video.currentTime + deltaSeconds),
    );
  };

  return (
    <div className="space-y-6">
      {/* Video Streaming Area */}
      {streamUrl ? (
        <div className="card-surface overflow-hidden p-3 sm:p-5 bg-white border border-sky-100 shadow-md shadow-sky-100/50">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950 shadow-lg">
            <video
              ref={videoRef}
              controls
              playsInline
              poster={thumb}
              className="h-full w-full object-contain"
              onPlay={(e) => {
                setIsPlaying(true);
                e.currentTarget.playbackRate = playbackSpeed;
              }}
              onPause={() => setIsPlaying(false)}
            />
          </div>

          {/* Quick Controls & Stream Metadata Strip */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">
                <Zap className="h-3 w-3 fill-current text-sky-500" />
                {isDirectMp4 ? "Ultra-Fast MP4 Stream" : "High-Definition Stream"}
              </span>
              {duration && (
                <span className="text-slate-500 font-medium">· Duration: {duration}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Skip backward 10s */}
              <button
                type="button"
                onClick={() => handleSeek(-10)}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/70 px-2.5 py-1 text-[11px] font-semibold text-sky-800 transition hover:bg-sky-100"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="h-3 w-3" />
                <span>10s</span>
              </button>

              {/* Skip forward 10s */}
              <button
                type="button"
                onClick={() => handleSeek(10)}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/70 px-2.5 py-1 text-[11px] font-semibold text-sky-800 transition hover:bg-sky-100"
                title="Forward 10 seconds"
              >
                <RotateCw className="h-3 w-3" />
                <span>10s</span>
              </button>

              <span className="text-slate-400 text-[11px] ml-1 font-medium">Speed:</span>
              {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPlaybackSpeed(s);
                    if (videoRef.current) videoRef.current.playbackRate = s;
                  }}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition ${
                    playbackSpeed === s
                      ? "bg-sky-600 text-white shadow-xs"
                      : "border border-sky-100 bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  {s}x
                </button>
              ))}

              {isDirectMp4 && (
                <a
                  href={streamUrl}
                  download={`${title}.mp4`}
                  className="ml-1 inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                  title="Download MP4 Video directly"
                >
                  <Download className="h-3 w-3" />
                  <span>Download MP4</span>
                </a>
              )}

              {streamUrl && (
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 transition hover:bg-sky-100 hover:border-sky-300"
                  title="Open video in new tab"
                >
                  <ExternalLink className="h-3 w-3 text-sky-600" />
                  <span>Open in New Tab</span>
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Video not yet released or audio/live scheduled */
        <div className="card-surface p-10 text-center border-sky-100 bg-white">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
            <Video className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Lecture Scheduled</h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {item.startTime
              ? `Scheduled for ${new Date(item.startTime).toLocaleDateString()} at ${new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
              : "This lecture stream will be ready once the session is processed."}
          </p>
        </div>
      )}

      {/* Title & Chapter Details */}
      <div className="card-surface p-5 sm:p-6 bg-white border-sky-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
              {title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
              {duration && <span>{duration}</span>}
              {item.startTime && (
                <span>· Scheduled: {new Date(item.startTime).toLocaleDateString()}</span>
              )}
              {item.status && (
                <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-100">
                  {item.status}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {streamUrl && (
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 hover:border-sky-300"
                title="Open video in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
                <span>Open Video in New Tab</span>
              </a>
            )}
            <Link
              to="/batches/$batchId/subject/$subjectId/topic/$topicId"
              params={{ batchId, subjectId, topicId }}
              search={{ name: undefined, slug: undefined }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-sky-600" />
              <span>Back to Chapter</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Attachments Section (Notes, DPPs) */}
      {files.length > 0 && (
        <div className="card-surface p-5 sm:p-6 bg-white border-sky-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4">
            <FileText className="h-4 w-4 text-sky-600" />
            <span>Lecture Notes & Attached PDFs ({files.length})</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {files.map((file, i) => (
              <a
                key={`${file.url}-${i}`}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/30 p-3.5 transition hover:border-sky-300 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-sky-100 text-sky-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">{file.name}</p>
                    <span className="text-[10px] text-slate-400 font-medium">PDF Document</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-sky-700">
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
