import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Loader2,
  FileText,
  ArrowLeft,
  Zap,
  RotateCcw,
  RotateCw,
  Sliders,
  Eye,
  Moon,
  Play,
  PlayCircle,
} from "lucide-react";
import {
  API_BASE,
  PROXY_STREAM_BASE,
  fetchContent,
  fetchVideoById,
  itemAttachments,
  normalizeStreamUrl,
  getAlternateStreamUrl,
  proxyStream,
  resolvePlayback,
  extractVideoId,
  type ContentItem,
  type Attachment,
} from "@/lib/api";
import { Shell, Crumbs, ErrorBox } from "@/components/shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSimpleDate } from "@/lib/dates";
import { useXP } from "@/lib/xp-system";
import { XPModal } from "@/components/XPModal";
import { SleepTimerModal, SleepTimerTriggeredOverlay } from "@/components/SleepTimerModal";

export const Route = createFileRoute(
  "/batches/$batchId/subject/$subjectId/topic/$topicId/lecture/$lectureId",
)({
  validateSearch: (search: Record<string, unknown>) => ({
    videoId: typeof search["videoId"] === "string" ? search["videoId"] : undefined,
    title: typeof search["title"] === "string" ? search["title"] : undefined,
  }),
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
  const { videoId: searchVideoId, title: searchTitle } = Route.useSearch();
  const [previewPdf, setPreviewPdf] = useState<{
    name: string;
    url: string;
  } | null>(null);

  // 1. Fetch item from content pages (check current topic first)
  const {
    data: itemData,
    isLoading: itemLoading,
    error: itemError,
  } = useQuery({
    queryKey: ["lecture-item", batchId, subjectId, topicId, lectureId, searchVideoId],
    queryFn: async () => {
      const pages = await Promise.all([
        fetchContent(batchId, subjectId, "Videos", topicId, 1),
        fetchContent(batchId, subjectId, "Videos", topicId, 2),
      ]);
      const all = pages.flat();
      const match = all.find(
        (i) =>
          i._id === lectureId ||
          i._id === searchVideoId ||
          i.videoDetails?._id === lectureId ||
          i.videoDetails?._id === searchVideoId ||
          i.videoDetails?.id === lectureId ||
          i.videoDetails?.id === searchVideoId,
      );
      if (match) return match;

      // Fallback: untagged videos
      const untagged = await fetchContent(batchId, subjectId, "Videos", undefined, 1);
      return (
        untagged.find(
          (i) =>
            i._id === lectureId ||
            i._id === searchVideoId ||
            i.videoDetails?._id === lectureId ||
            i.videoDetails?._id === searchVideoId ||
            i.videoDetails?.id === lectureId ||
            i.videoDetails?.id === searchVideoId,
        ) ?? null
      );
    },
  });

  // 2. Query direct video stream from proxy or resolution
  const { data: videoData, isLoading: videoLoading } = useQuery({
    queryKey: [
      "lecture-video-stream",
      lectureId,
      searchVideoId,
      itemData?.videoDetails?._id || itemData?.videoDetails?.id,
    ],
    queryFn: async () => {
      // 1. If explicit videoId passed in search, query directly
      if (searchVideoId) {
        const vSearch = await fetchVideoById(searchVideoId);
        if (vSearch?.videoUrl) return vSearch;
      }

      // 2. Query direct lectureId (if it's already a video ID)
      const vDirect = await fetchVideoById(lectureId);
      if (vDirect?.videoUrl) return vDirect;

      // 3. Try itemData.videoDetails._id or id if available
      const nestedId = itemData?.videoDetails?._id || itemData?.videoDetails?.id;
      if (nestedId && nestedId !== lectureId && nestedId !== searchVideoId) {
        const vNested = await fetchVideoById(nestedId);
        if (vNested?.videoUrl) return vNested;
      }

      // 4. Try videoId extracted from itemData?.url or itemData?.videoDetails?.videoUrl
      const extractedId =
        extractVideoId(itemData?.url) || extractVideoId(itemData?.videoDetails?.videoUrl);
      if (extractedId && extractedId !== lectureId && extractedId !== nestedId) {
        const vExtracted = await fetchVideoById(extractedId);
        if (vExtracted?.videoUrl) return vExtracted;
      }

      // 5. Fallback to resolvePlayback
      const playback = await resolvePlayback(
        batchId,
        subjectId,
        searchVideoId || lectureId,
        itemData?.videoDetails?.videoUrl || itemData?.url,
      );
      if (playback?.src) {
        return {
          _id: lectureId,
          videoUrl: playback.src,
          name: itemData?.topic || itemData?.name || searchTitle,
          duration: itemData?.videoDetails?.duration,
          image: itemData?.videoDetails?.image,
        };
      }

      return null;
    },
  });

  // Loading while video stream details are fetching
  const isOverallLoading = !videoData && (videoLoading || itemLoading);

  const handlePreviewPdf = (att: Attachment) => {
    const rawUrl = att.url || att.download_url || att.fileUrl || "";
    setPreviewPdf({
      name: att.name || "Lecture Document.pdf",
      url: rawUrl,
    });
  };

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

      {isOverallLoading && (
        <div className="card-surface aspect-video w-full flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 p-8 text-center rounded-2xl shadow-sm">
          <Loader2 className="h-9 w-9 animate-spin text-sky-600 dark:text-sky-400" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Loading lecture…</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Please wait while the video stream is initialized
          </p>
        </div>
      )}

      {itemError && <ErrorBox message={(itemError as Error).message} />}

      {!isOverallLoading && (
        <LecturePlayerView
          item={itemData ?? { _id: lectureId }}
          videoData={videoData}
          batchId={batchId}
          subjectId={subjectId}
          topicId={topicId}
          lectureId={lectureId}
          onPreviewPdf={handlePreviewPdf}
        />
      )}

      {/* In-App PDF Preview Dialog */}
      <Dialog open={Boolean(previewPdf)} onOpenChange={(open) => !open && setPreviewPdf(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border dark:border-slate-800">
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {previewPdf?.name}
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">In-app document viewer</p>
            </div>
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-0 bg-slate-50 dark:bg-slate-950 rounded-lg overflow-hidden border border-border dark:border-slate-800">
            {previewPdf && (
              <iframe
                src={previewPdf.url}
                className="w-full h-full border-0"
                title={previewPdf.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function LecturePlayerView({
  item,
  videoData,
  batchId,
  subjectId,
  topicId,
  lectureId: _lectureId,
  onPreviewPdf,
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
  onPreviewPdf: (att: Attachment) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const files = itemAttachments(item);
  const title =
    videoData?.name || item.topic || item.videoDetails?.name || item.name || "Lecture Video";
  const duration = videoData?.duration || item.videoDetails?.duration;
  const thumb = videoData?.image || item.videoDetails?.image;

  // PW XP Real-Time Tracker Hook
  const { totalXp, unclaimedSeconds, addTime } = useXP();
  const [isXpModalOpen, setIsXpModalOpen] = useState(false);

  // Sleep Timer States
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isSleepOverlayOpen, setIsSleepOverlayOpen] = useState(false);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  // Multiple Quality states
  const [qualities, setQualities] = useState<
    { label: string; levelIndex: number; height?: number }[]
  >([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);

  // Resolve best stream URL
  const rawStreamUrl = videoData?.videoUrl || item.videoDetails?.videoUrl || item.url;
  const streamUrl = normalizeStreamUrl(rawStreamUrl);

  const isDirectMp4 = Boolean(
    streamUrl && (streamUrl.includes(".mp4") || streamUrl.includes("/stream/")),
  );

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Real-time PW XP Tracker: adds 1 watch second every second played (120s = 1 XP)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (v && !v.paused && !v.ended) {
        addTime(1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, addTime]);

  // Sleep Timer Countdown Effect
  useEffect(() => {
    if (sleepTimerRemaining === null || sleepTimerRemaining <= 0) return;
    const interval = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (videoRef.current) {
            videoRef.current.pause();
          }
          setIsPlaying(false);
          setIsSleepOverlayOpen(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerRemaining]);

  // Initialize playback via native HTML5 video or HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Direct MP4 playback
    if (isDirectMp4 || streamUrl.endsWith(".mp4")) {
      video.src = streamUrl;
      video.load();
      video.play().catch(() => {
        // Autoplay may be restricted until user taps play button
      });
      setQualities([
        { label: "Auto", levelIndex: -1 },
        { label: "1080p", levelIndex: 1080, height: 1080 },
        { label: "720p", levelIndex: 720, height: 720 },
        { label: "480p", levelIndex: 480, height: 480 },
        { label: "360p", levelIndex: 360, height: 360 },
      ]);
      return;
    }

    // Handle HLS stream (.m3u8 / .mpd)
    const hlsSource = streamUrl.replace(/\.mpd(\?|#|$)/i, ".m3u8$1");
    const proxiedHls = hlsSource.startsWith("http") ? proxyStream(hlsSource) : hlsSource;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (data.levels && data.levels.length > 0) {
          const parsed = data.levels.map((lvl, index) => {
            const h = lvl.height || parseInt(lvl.name) || 0;
            return {
              label: h ? `${h}p` : lvl.name || `Q${index + 1}`,
              levelIndex: index,
              height: h,
            };
          });

          parsed.sort((a, b) => (b.height || 0) - (a.height || 0));
          setQualities([{ label: "Auto", levelIndex: -1 }, ...parsed]);
        }
        video.play().catch(() => {});
      });

      hls.loadSource(proxiedHls);
      hls.attachMedia(video);
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = proxiedHls;
      video.load();
      video.play().catch(() => {});
      setQualities([
        { label: "Auto", levelIndex: -1 },
        { label: "720p", levelIndex: 720, height: 720 },
        { label: "480p", levelIndex: 480, height: 480 },
      ]);
    } else {
      video.src = streamUrl;
      video.load();
      video.play().catch(() => {});
    }
  }, [streamUrl, isDirectMp4]);

  const handleQualityChange = (levelIndex: number) => {
    setCurrentQualityIndex(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  };

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
        <div className="card-surface overflow-hidden p-3 sm:p-5 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-md shadow-sky-100/50 dark:shadow-none rounded-2xl">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950 shadow-lg group">
            <video
              ref={videoRef}
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              playsInline
              poster={thumb}
              className="h-full w-full object-contain cursor-pointer"
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) {
                  v.play().catch(() => {});
                } else {
                  v.pause();
                }
              }}
              onError={() => {
                const v = videoRef.current;
                if (!v || !streamUrl) return;
                const alt = getAlternateStreamUrl(streamUrl);
                if (alt && v.src !== alt) {
                  v.src = alt;
                  v.load();
                  v.play().catch(() => {});
                }
              }}
              onPlay={(e) => {
                setIsPlaying(true);
                e.currentTarget.playbackRate = playbackSpeed;
              }}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Prominent Center Play Button when paused */}
            {!isPlaying && (
              <button
                type="button"
                onClick={() => {
                  const v = videoRef.current;
                  if (v) {
                    v.play().catch(() => {});
                  }
                }}
                className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-600/95 hover:bg-sky-500 text-white shadow-2xl transition hover:scale-110 cursor-pointer pointer-events-auto"
                aria-label="Play Lecture Video"
              >
                <Play className="h-8 w-8 fill-current ml-1 text-white" />
              </button>
            )}
          </div>

          {/* Quick Controls, Speed, Sleep Timer & Quality Selectors */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                <Zap className="h-3 w-3 fill-current text-sky-500" />
                {isDirectMp4 ? "Ultra-Fast Stream" : "High-Definition Stream"}
              </span>

              {duration && (
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  · Duration: {duration}
                </span>
              )}

              {/* PW XP Live Ticker Pill */}
              <button
                type="button"
                onClick={() => setIsXpModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer shadow-2xs"
                title="PW XP: Earn 1 XP every 2 minutes of lecture watched"
              >
                <Zap className="h-3 w-3 fill-current text-amber-500 animate-pulse" />
                <span>{totalXp} XP</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                  ({Math.floor(unclaimedSeconds / 60)}m {unclaimedSeconds % 60}s / 2m)
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Skip backward 10s */}
              <button
                type="button"
                onClick={() => handleSeek(-10)}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 dark:border-slate-800 bg-sky-50/70 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-sky-800 dark:text-sky-300 transition hover:bg-sky-100 dark:hover:bg-slate-700 cursor-pointer"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="h-3 w-3" />
                <span>10s</span>
              </button>

              {/* Skip forward 10s */}
              <button
                type="button"
                onClick={() => handleSeek(10)}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 dark:border-slate-800 bg-sky-50/70 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-sky-800 dark:text-sky-300 transition hover:bg-sky-100 dark:hover:bg-slate-700 cursor-pointer"
                title="Forward 10 seconds"
              >
                <RotateCw className="h-3 w-3" />
                <span>10s</span>
              </button>

              {/* Sleep Timer Button */}
              <button
                type="button"
                onClick={() => setIsSleepModalOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                  sleepTimerRemaining !== null && sleepTimerRemaining > 0
                    ? "border-indigo-400 bg-indigo-500 text-white shadow-xs"
                    : "border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300"
                }`}
                title="Set lecture sleep timer"
              >
                <Moon className="h-3 w-3 fill-current" />
                {sleepTimerRemaining !== null && sleepTimerRemaining > 0 ? (
                  <span className="font-mono">
                    {Math.floor(sleepTimerRemaining / 60)}:
                    {sleepTimerRemaining % 60 < 10 ? "0" : ""}
                    {sleepTimerRemaining % 60}
                  </span>
                ) : (
                  <span>Sleep Timer</span>
                )}
              </button>

              {/* Playback Speed Selectors */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium mr-0.5">
                  Speed:
                </span>
                {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setPlaybackSpeed(s);
                      if (videoRef.current) videoRef.current.playbackRate = s;
                    }}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                      playbackSpeed === s
                        ? "bg-sky-600 text-white shadow-xs"
                        : "border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Multiple Quality Playback Selectors */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium flex items-center gap-1 mr-0.5">
                  <Sliders className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                  <span>Quality:</span>
                </span>
                {qualities.length > 0
                  ? qualities.map((q) => (
                      <button
                        key={q.levelIndex}
                        type="button"
                        onClick={() => handleQualityChange(q.levelIndex)}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                          currentQualityIndex === q.levelIndex
                            ? "bg-sky-600 text-white shadow-xs"
                            : "border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))
                  : [
                      { label: "Auto", idx: -1 },
                      { label: "720p", idx: 720 },
                      { label: "480p", idx: 480 },
                      { label: "360p", idx: 360 },
                    ].map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => setCurrentQualityIndex(q.idx)}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                          currentQualityIndex === q.idx
                            ? "bg-sky-600 text-white shadow-xs"
                            : "border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* While loading/resolving, shows Loading lecture */
        <div className="card-surface p-12 text-center border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-slate-700">
            <Loader2 className="h-6 w-6 animate-spin text-sky-600 dark:text-sky-400" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Loading lecture…
          </h2>
          <p
            suppressHydrationWarning
            className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto"
          >
            {item.startTime
              ? `Session scheduled for ${formatSimpleDate(item.startTime)}. Video stream will be available soon.`
              : "Connecting to video stream server, please wait…"}
          </p>
        </div>
      )}

      {/* Title & Chapter Details */}
      <div className="card-surface p-5 sm:p-6 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-sm rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
              {title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              {duration && <span>{duration}</span>}
              {item.startTime && (
                <span suppressHydrationWarning>
                  · Scheduled: {formatSimpleDate(item.startTime)}
                </span>
              )}
              {item.status && (
                <span className="rounded bg-sky-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-slate-700">
                  {item.status}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Link
              to="/batches/$batchId/subject/$subjectId/topic/$topicId"
              params={{ batchId, subjectId, topicId }}
              search={{ name: undefined, slug: undefined }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span>Back to Chapter</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Attachments Section (Notes, DPPs) - In-app viewer only */}
      {files.length > 0 && (
        <div className="card-surface p-5 sm:p-6 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-sm rounded-2xl">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm mb-4">
            <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>Lecture Notes & Attached PDFs ({files.length})</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {files.map((file, i) => (
              <div
                key={`${file.url}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-sky-100 dark:border-slate-800 bg-sky-50/30 dark:bg-slate-800/40 p-3.5 transition hover:border-sky-300 dark:hover:border-sky-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                      {file.name}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      PDF Document
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onPreviewPdf(file)}
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-sky-700 cursor-pointer"
                >
                  <Eye className="h-3 w-3" />
                  <span>View PDF</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PW XP Details Modal */}
      <XPModal isOpen={isXpModalOpen} onClose={() => setIsXpModalOpen(false)} />

      {/* Sleep Timer Selector Modal */}
      <SleepTimerModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
        activeRemainingSeconds={sleepTimerRemaining}
        onSetTimer={(secs) => setSleepTimerRemaining(secs)}
        onCancelTimer={() => setSleepTimerRemaining(null)}
        videoDurationSeconds={videoRef.current?.duration || 0}
        currentVideoTime={videoRef.current?.currentTime || 0}
      />

      {/* Sleep Timer Triggered Notification Overlay */}
      {isSleepOverlayOpen && (
        <SleepTimerTriggeredOverlay
          onDismiss={() => setIsSleepOverlayOpen(false)}
          onResume={() => {
            setIsSleepOverlayOpen(false);
            videoRef.current?.play();
          }}
        />
      )}
    </div>
  );
}
