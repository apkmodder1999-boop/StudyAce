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
  ExternalLink,
} from "lucide-react";
import {
  API_BASE,
  fetchContent,
  fetchVideoById,
  fetchVideoUrlDetails,
  itemAttachments,
  normalizeStreamUrl,
  getAlternateStreamUrl,
  resolvePlayback,
  extractVideoId,
  type ContentItem,
  type Attachment,
} from "@/lib/api";
import { getLectureVideoStream } from "@/lib/videoService";
import { Shell, Crumbs, ErrorBox } from "@/components/shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PDFActionDialog } from "@/components/PDFActionDialog";
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
      { title: "Watch Lecture — Physics Wallah (PW)" },
      {
        name: "description",
        content: "Stream the video lecture in high-definition with official Physics Wallah player.",
      },
      { property: "og:title", content: "Watch Lecture — Physics Wallah (PW)" },
      {
        property: "og:description",
        content: "Stream the video lecture in high-definition with official Physics Wallah player.",
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

  // 1. Fetch item from content pages (check current topic first, then untagged)
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
        fetchContent(batchId, subjectId, "DppVideos", topicId, 1),
        fetchContent(batchId, subjectId, "DppNotes", topicId, 1),
        fetchContent(batchId, subjectId, "notes", topicId, 1),
      ]);
      const all = pages.flat();
      const match = all.find(
        (i) =>
          i._id === lectureId ||
          i._id === searchVideoId ||
          i.videoDetails?._id === lectureId ||
          i.videoDetails?._id === searchVideoId ||
          i.videoDetails?.id === lectureId ||
          i.videoDetails?.id === searchVideoId ||
          (i.url && extractVideoId(i.url) === lectureId),
      );
      if (match) return match;

      // Fallback: untagged videos, DPP videos, notes
      const untagged = await Promise.all([
        fetchContent(batchId, subjectId, "Videos", undefined, 1),
        fetchContent(batchId, subjectId, "DppVideos", undefined, 1),
        fetchContent(batchId, subjectId, "notes", undefined, 1),
      ]);
      return (
        untagged
          .flat()
          .find(
            (i) =>
              i._id === lectureId ||
              i._id === searchVideoId ||
              i.videoDetails?._id === lectureId ||
              i.videoDetails?._id === searchVideoId ||
              i.videoDetails?.id === lectureId ||
              i.videoDetails?.id === searchVideoId ||
              (i.url && extractVideoId(i.url) === lectureId),
          ) ?? null
      );
    },
  });

  // CRITICAL ID RULE: The childId parameter MUST be the TOP-LEVEL content item ID (item._id)
  // NEVER the nested item.videoDetails._id or video stream ID!
  // If itemData resolved, itemData._id is strictly the top-level ID (e.g., "6a8ae8f0ea10b9d29631c310")
  const resolvedTopLevelId =
    itemData?._id ||
    (itemData?.videoDetails?._id && lectureId === itemData.videoDetails._id
      ? itemData._id
      : lectureId);

  // Sync browser URL if opened with nested videoDetails._id so address bar shows the true top-level ID
  useEffect(() => {
    if (itemData?._id && itemData._id !== lectureId && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      const correctedPath = currentPath.replace(lectureId, itemData._id);
      if (correctedPath !== currentPath) {
        window.history.replaceState(null, "", correctedPath + window.location.search);
      }
    }
  }, [itemData?._id, lectureId]);

  // 2. Query direct video stream using official getLectureVideoStream
  // CRITICAL ID RULE: childId MUST be the TOP-LEVEL content item ID (item._id)
  // NEVER the nested item.videoDetails._id!
  const { data: videoData, isLoading: videoLoading } = useQuery({
    queryKey: ["lecture-video-stream", batchId, resolvedTopLevelId, itemData?._id],
    enabled: Boolean(batchId && !itemLoading && resolvedTopLevelId),
    queryFn: async () => {
      const topLevelChildId = itemData?._id || resolvedTopLevelId;
      if (!topLevelChildId || !batchId) return null;

      const effectiveItem: ContentItem = itemData || {
        _id: topLevelChildId,
        topic: searchTitle,
        name: searchTitle,
      };

      // 1. Primary: Official PiMaxer video-url-details endpoint with top-level ID (item._id)
      try {
        const res = await getLectureVideoStream(batchId, effectiveItem);
        if (res?.streamUrl) {
          return {
            _id: topLevelChildId,
            videoUrl: res.streamUrl,
            name: res.title || searchTitle,
            duration: res.duration,
            image: res.image,
          };
        }
      } catch (err) {
        console.warn("[LecturePage] getLectureVideoStream failed, trying direct fallbacks:", err);
      }

      // Bottom video ID (from itemData.videoDetails._id or stream URL)
      const bottomVideoId =
        itemData?.videoDetails?._id ||
        itemData?.videoDetails?.id ||
        (itemData?.url ? extractVideoId(itemData.url) : null) ||
        (lectureId !== topLevelChildId ? lectureId : null);

      // 2. Direct videoDetails stream URL (if available)
      if (itemData?.videoDetails?.videoUrl) {
        return {
          _id: topLevelChildId,
          videoUrl: normalizeStreamUrl(itemData.videoDetails.videoUrl),
          name: itemData?.topic || itemData?.name || searchTitle,
          duration: itemData?.videoDetails?.duration,
          image: itemData?.videoDetails?.image,
        };
      }

      // 3. Direct stream CDN using bottom video ID
      if (bottomVideoId) {
        return {
          _id: topLevelChildId,
          videoUrl: `https://a.pimaxer.in/stream/${bottomVideoId}/video.mp4`,
          name: itemData?.topic || itemData?.name || searchTitle,
          duration: itemData?.videoDetails?.duration,
          image: itemData?.videoDetails?.image,
        };
      }

      // 4. Fallback: Direct video endpoint https://a.pimaxer.in/v1/videos/{videoId}
      if (bottomVideoId) {
        const directVideo = await fetchVideoById(bottomVideoId);
        if (directVideo?.videoUrl) return directVideo;
      }

      return null;
    },
  });

  // Loading while item or video stream details are fetching
  const isOverallLoading = itemLoading || (!videoData && videoLoading);

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
        <div className="card-surface aspect-video w-full flex flex-col items-center justify-center gap-3 bg-card border border-primary/20 p-8 text-center rounded-2xl shadow-sm">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm font-bold text-foreground">Loading lecture…</p>
          <p className="text-xs text-muted-foreground font-medium">
            Please wait while the video stream is initialized
          </p>
        </div>
      )}

      {itemError && <ErrorBox message={(itemError as Error).message} />}

      {!isOverallLoading && (
        <LecturePlayerView
          item={itemData ?? { _id: resolvedTopLevelId }}
          videoData={videoData}
          batchId={batchId}
          subjectId={subjectId}
          topicId={topicId}
          lectureId={resolvedTopLevelId}
          onPreviewPdf={handlePreviewPdf}
        />
      )}

      {/* PDF Direct Actions Dialog (Do NOT Proxy) */}
      <PDFActionDialog
        document={previewPdf}
        open={Boolean(previewPdf)}
        onOpenChange={(open) => !open && setPreviewPdf(null)}
      />
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

  // Player Mode: "iframe" by default (direct embedding without proxying)
  const [playerMode, setPlayerMode] = useState<"iframe" | "video">("iframe");

  // Resolve best stream URL directly without proxying
  const rawStreamUrl = videoData?.videoUrl || item.videoDetails?.videoUrl || item.url;
  const streamUrl = normalizeStreamUrl(rawStreamUrl);

  // Derive direct iframe embed URL (e.g. YouTube embed or direct stream URL)
  const iframeUrl = (() => {
    if (!streamUrl) return "";
    const ytMatch = streamUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    if (ytMatch) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    }
    return streamUrl;
  })();

  const isDirectMp4 = Boolean(
    streamUrl && (streamUrl.includes(".mp4") || streamUrl.includes("/stream/")),
  );

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Real-time PW XP Tracker: adds 1 watch second every second played (120s = 1 XP)
  useEffect(() => {
    if (playerMode === "iframe") {
      const interval = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          addTime(1);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      if (!isPlaying) return;
      const interval = setInterval(() => {
        const v = videoRef.current;
        if (v && !v.paused && !v.ended) {
          addTime(1);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [playerMode, isPlaying, addTime]);

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

  // Initialize playback via native HTML5 video or HLS.js when in video mode
  useEffect(() => {
    if (playerMode !== "video") return;
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Direct MP4 playback
    if (isDirectMp4 || streamUrl.endsWith(".mp4")) {
      video.src = streamUrl;
      video.load();
      video.play().catch(() => {});
      setQualities([
        { label: "Auto", levelIndex: -1 },
        { label: "1080p", levelIndex: 1080, height: 1080 },
        { label: "720p", levelIndex: 720, height: 720 },
        { label: "480p", levelIndex: 480, height: 480 },
        { label: "360p", levelIndex: 360, height: 360 },
      ]);
      return;
    }

    // Handle direct HLS stream (.m3u8 / .mpd) without proxying
    const hlsSource = streamUrl.replace(/\.mpd(\?|#|$)/i, ".m3u8$1");

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

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              if (item?.videoDetails?.videoUrl && video) {
                video.src = item.videoDetails.videoUrl;
                video.load();
                video.play().catch(() => {});
              }
              break;
          }
        }
      });

      hls.loadSource(hlsSource);
      hls.attachMedia(video);
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsSource;
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
  }, [playerMode, streamUrl, isDirectMp4, item?.videoDetails?.videoUrl]);

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
        <div className="card-surface overflow-hidden p-3 sm:p-4 bg-card border border-border shadow-xs rounded-xl">
          {playerMode === "iframe" ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg">
              <iframe
                src={iframeUrl}
                title={title}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg group">
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
                  className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/95 hover:bg-primary text-primary-foreground shadow-xl transition hover:scale-105 cursor-pointer pointer-events-auto"
                  aria-label="Play Lecture Video"
                >
                  <Play className="h-6 w-6 fill-current ml-0.5" />
                </button>
              )}
            </div>
          )}

          {/* Quick Controls, Speed, Sleep Timer & Quality Selectors */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Player Mode Switcher */}
              <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setPlayerMode("iframe")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    playerMode === "iframe"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  iFrame Player
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerMode("video")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    playerMode === "video"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  HTML5 Video
                </button>
              </div>

              {duration && (
                <span className="text-muted-foreground font-medium text-[11px]">
                  · Duration: {duration}
                </span>
              )}

              {/* PW XP Live Ticker Pill */}
              <button
                type="button"
                onClick={() => setIsXpModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition cursor-pointer shadow-2xs"
                title="PW XP: Earn 1 XP every 2 minutes of lecture watched"
              >
                <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span>{totalXp} XP</span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  ({Math.floor(unclaimedSeconds / 60)}m {unclaimedSeconds % 60}s / 2m)
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Direct Open Link */}
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
                title="Open stream URL directly in new tab"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Open Link</span>
              </a>

              {/* Sleep Timer Button */}
              <button
                type="button"
                onClick={() => setIsSleepModalOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                  sleepTimerRemaining !== null && sleepTimerRemaining > 0
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
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

              {/* Controls visible in Video Mode */}
              {playerMode === "video" && (
                <>
                  {/* Skip backward 10s */}
                  <button
                    type="button"
                    onClick={() => handleSeek(-10)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
                    title="Rewind 10 seconds"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>10s</span>
                  </button>

                  {/* Skip forward 10s */}
                  <button
                    type="button"
                    onClick={() => handleSeek(10)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
                    title="Forward 10 seconds"
                  >
                    <RotateCw className="h-3 w-3" />
                    <span>10s</span>
                  </button>

                  {/* Playback Speed Selectors */}
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-[11px] font-medium mr-0.5">Speed:</span>
                    {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setPlaybackSpeed(s);
                          if (videoRef.current) videoRef.current.playbackRate = s;
                        }}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                          playbackSpeed === s
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  {/* Quality Selectors */}
                  {qualities.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1 mr-0.5">
                        <Sliders className="h-3 w-3 text-primary" />
                        <span>Quality:</span>
                      </span>
                      {qualities.map((q) => (
                        <button
                          key={q.levelIndex}
                          type="button"
                          onClick={() => handleQualityChange(q.levelIndex)}
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                            currentQualityIndex === q.levelIndex
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* While loading/resolving, shows Loading lecture */
        <div className="card-surface p-12 text-center border border-border bg-card rounded-xl">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-muted text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <h2 className="text-sm font-bold text-foreground">Loading lecture…</h2>
          <p
            suppressHydrationWarning
            className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto"
          >
            {item.startTime
              ? `Session scheduled for ${formatSimpleDate(item.startTime)}. Video stream will be available soon.`
              : "Connecting to video stream server, please wait…"}
          </p>
        </div>
      )}

      {/* Title & Chapter Details */}
      <div className="card-surface p-4 sm:p-5 bg-card border border-border shadow-2xs rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-snug">{title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
              {duration && <span>{duration}</span>}
              {item.startTime && (
                <span suppressHydrationWarning>
                  · Scheduled: {formatSimpleDate(item.startTime)}
                </span>
              )}
              {item.status && (
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border">
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-primary" />
              <span>Back to Chapter</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Attachments Section (Notes, DPPs) - In-app viewer only */}
      {files.length > 0 && (
        <div className="card-surface p-4 sm:p-5 bg-card border border-border shadow-2xs rounded-xl">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <span>Lecture Notes & Attached PDFs ({files.length})</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {files.map((file, i) => (
              <div
                key={`${file.url}-${i}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 transition hover:border-primary/50 hover:bg-card"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-muted text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{file.name}</p>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      PDF Document
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onPreviewPdf(file)}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-2xs transition hover:bg-primary/90 cursor-pointer"
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
