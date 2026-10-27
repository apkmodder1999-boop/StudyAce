import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  FileText,
  Clock,
  Play,
  BookOpen,
  AlertCircle,
  Terminal,
  RefreshCw,
  Eye,
  Download,
} from "lucide-react";
import {
  API_BASE,
  fetchTopicContent,
  itemAttachments,
  attachmentUrl,
  type ContentItem,
  type ContentType,
} from "@/lib/api";
import { Shell, Crumbs, PageTitle, Loading, EmptyBox } from "@/components/shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PDFActionDialog } from "@/components/PDFActionDialog";
import { formatSimpleDate } from "@/lib/dates";

// Supported Content Types: videos, DppVideos, notes, DppNotes, Test
const TABS: { key: ContentType; label: string }[] = [
  { key: "videos", label: "📹 Lectures" },
  { key: "notes", label: "📝 Notes" },
  { key: "DppNotes", label: "📋 DPP Sheets" },
  { key: "DppVideos", label: "🎬 DPP Videos" },
  { key: "Test", label: "📝 Test Papers" },
];

export const Route = createFileRoute("/batches/$batchId/subject/$subjectId/topic/$topicId/")({
  head: () => ({
    meta: [
      { title: "Chapter Content — Physics Wallah (PW)" },
      {
        name: "description",
        content: "Watch lectures, view chapter notes, and access DPPs on Physics Wallah.",
      },
      { property: "og:title", content: "Chapter Content — Physics Wallah (PW)" },
      {
        property: "og:description",
        content: "Watch lectures, view chapter notes, and access DPPs on Physics Wallah.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search["name"] === "string" ? search["name"] : undefined,
    slug: typeof search["slug"] === "string" ? search["slug"] : undefined,
  }),
  component: TopicPage,
});

function TopicPage() {
  const { batchId, subjectId, topicId } = Route.useParams();
  const { name, slug } = Route.useSearch();
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  const initialTab: ContentType =
    name?.toLowerCase().includes("note") ||
    name?.toLowerCase().includes("book") ||
    name?.toLowerCase().includes("sheet")
      ? "notes"
      : name?.toLowerCase().includes("dpp video")
        ? "DppVideos"
        : name?.toLowerCase().includes("dpp")
          ? "DppNotes"
          : name?.toLowerCase().includes("test")
            ? "Test"
            : "videos";
  const [tab, setTab] = useState<ContentType>(initialTab);
  const [previewPdf, setPreviewPdf] = useState<{
    name: string;
    url: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["content", batchId, subjectId, topicId, tab, slug],
    queryFn: () => fetchTopicContent(batchId, subjectId, tab, topicId, name, slug),
  });

  const items = data ?? [];

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
            label: "Subject",
            to: (
              <Link
                to="/batches/$batchId/subject/$subjectId"
                params={{ batchId, subjectId }}
                className="hover:text-foreground"
              >
                Subject
              </Link>
            ),
          },
          { label: name ?? "Chapter" },
        ]}
      />
      <PageTitle title={name ?? "Chapter"} />

      {/* Filter Tabs - Mixing Chosen Primary Color */}
      <div className="mb-6 inline-flex rounded-2xl bg-muted/80 p-1.5 border border-primary/20 shadow-xs">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {isLoading && <Loading />}
      {error && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Upstream Server Session Expired (HTTP 401)
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            {(error as Error).message}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsApiModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-2 cursor-pointer"
            >
              <Terminal className="h-3.5 w-3.5 text-primary" />
              Inspect Endpoint & Response
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyBox message={`No ${tab.toLowerCase()} published for this chapter yet.`} />
      )}

      {/* Rows for Videos / Notes / DPPs / Tests */}
      <div className="grid gap-3.5">
        {items.map((item, i) => {
          if (tab === "videos" || tab === "Videos" || tab === "DppVideos") {
            return (
              <VideoRow
                key={`${item._id}-${i}`}
                item={item}
                batchId={batchId}
                subjectId={subjectId}
                topicId={topicId}
                isDpp={tab === "DppVideos"}
              />
            );
          }
          return (
            <DocRow
              key={`${item._id}-${i}`}
              item={item}
              batchId={batchId}
              subjectId={subjectId}
              topicId={topicId}
              isDpp={tab === "DppNotes"}
              isTest={tab === "Test"}
              onPreviewPdf={(pdf) => setPreviewPdf(pdf)}
            />
          );
        })}
      </div>

      {/* PDF Direct Actions Dialog (Do NOT Proxy) */}
      <PDFActionDialog
        document={previewPdf}
        open={Boolean(previewPdf)}
        onOpenChange={(open) => !open && setPreviewPdf(null)}
      />

      {/* API Endpoint & Session Inspector Dialog */}
      <Dialog open={isApiModalOpen} onOpenChange={setIsApiModalOpen}>
        <DialogContent className="max-w-md p-5 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Terminal className="h-4 w-4 text-primary" />
              Video URL Details & API Config
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 text-xs">
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Video Details Endpoint:</p>
              <code className="block rounded-lg bg-muted p-2 text-[11px] font-mono text-primary break-all border border-border">
                {`${API_BASE}/v1/video-url-details?parentId=${batchId}&childId={lectureId}`}
              </code>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Batch ID (parentId):</p>
              <code className="block rounded-lg bg-muted p-1.5 text-[11px] font-mono break-all border border-border">
                {batchId}
              </code>
            </div>
            <div>
              <label
                htmlFor="auth-token-input"
                className="font-semibold text-muted-foreground block mb-1"
              >
                Optional Auth Token (Bearer Token):
              </label>
              <input
                id="auth-token-input"
                type="text"
                placeholder="Paste token here if authorized…"
                defaultValue={
                  typeof window !== "undefined" ? localStorage.getItem("pw_auth_token") || "" : ""
                }
                onChange={(e) => {
                  if (typeof window !== "undefined") {
                    const val = e.target.value.trim();
                    if (val) {
                      localStorage.setItem("pw_auth_token", val);
                    } else {
                      localStorage.removeItem("pw_auth_token");
                    }
                  }
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsApiModalOpen(false);
                  window.location.reload();
                }}
                className="rounded-xl bg-primary px-4 py-2 font-bold text-xs text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                Save & Reload
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function VideoRow({
  item,
  batchId,
  subjectId,
  topicId,
  isDpp,
}: {
  item: ContentItem;
  batchId: string;
  subjectId: string;
  topicId: string;
  isDpp?: boolean;
}) {
  const thumb = item.videoDetails?.image;
  // CRITICAL ID RULE: The childId query parameter MUST be the TOP-LEVEL content item ID (item._id from contents array),
  // NEVER the nested item.videoDetails._id.
  const targetLectureId = item._id;
  const title =
    item.topic ??
    item.videoDetails?.name ??
    item.name ??
    (isDpp ? "DPP Solution Video" : "Lecture");

  return (
    <div className="card-surface group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-card border border-primary/20 hover:border-primary/60 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 rounded-2xl">
      <Link
        to="/batches/$batchId/subject/$subjectId/topic/$topicId/lecture/$lectureId"
        params={{ batchId, subjectId, topicId, lectureId: targetLectureId }}
        search={{ videoId: targetLectureId, title }}
        className="flex items-center gap-3.5 min-w-0 flex-1"
      >
        {thumb ? (
          <div className="relative h-18 w-28 flex-none overflow-hidden rounded-xl bg-muted border border-border">
            <img
              src={thumb}
              alt={item.topic ?? "Lecture"}
              loading="lazy"
              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition duration-200 group-hover:opacity-100">
              <Play className="h-6 w-6 fill-current text-white drop-shadow" />
            </div>
          </div>
        ) : (
          <div className="grid h-18 w-28 flex-none place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary transition duration-200 group-hover:scale-105">
            <Play className="h-6 w-6 fill-current" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm font-bold text-foreground transition group-hover:text-primary">
            {title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-medium">
            {item.videoDetails?.duration && <span>{item.videoDetails.duration}</span>}
            {item.status && !item.videoDetails?.duration && <span>{item.status}</span>}
            {item.startTime && (
              <span suppressHydrationWarning>· {formatSimpleDate(item.startTime)}</span>
            )}
            <span className="text-border">·</span>
            <span className="text-primary font-bold text-[11px] bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {isDpp ? "DPP Solution" : "HD Stream"}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2 self-end sm:self-center pr-1">
        <Link
          to="/batches/$batchId/subject/$subjectId/topic/$topicId/lecture/$lectureId"
          params={{ batchId, subjectId, topicId, lectureId: targetLectureId }}
          search={{ videoId: targetLectureId, title }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90 hover:scale-105 cursor-pointer"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>Watch</span>
        </Link>
      </div>
    </div>
  );
}

function DocRow({
  item,
  batchId,
  subjectId,
  topicId,
  isDpp,
  isTest,
  onPreviewPdf,
}: {
  item: ContentItem;
  batchId?: string;
  subjectId?: string;
  topicId?: string;
  isDpp?: boolean;
  isTest?: boolean;
  onPreviewPdf?: (pdf: { name: string; url: string }) => void;
}) {
  const homeworks =
    item.homeworkIds?.filter((h) => (h.attachmentIds && h.attachmentIds.length > 0) || h.topic) ??
    [];

  // Detect if item or homework has a video solution
  const hasVideoSolution = Boolean(
    isDpp ||
    item.isVideoLecture ||
    item.urlType === "penpencilvdo" ||
    item.videoDetails?.videoUrl ||
    item.videoDetails?._id ||
    item.videoDetails?.id ||
    item.url,
  );
  // CRITICAL ID RULE: Use TOP-LEVEL item._id as childId, NEVER the nested videoDetails._id
  const solutionVideoId = item._id;

  if (homeworks.length > 0) {
    return (
      <div className="space-y-3">
        {homeworks.map((hw, idx) => {
          const hwFiles: { name: string; url: string }[] = [];
          for (const a of hw.attachmentIds ?? []) {
            const url = attachmentUrl(a);
            if (url) {
              hwFiles.push({
                name: a.name ?? hw.topic ?? "Document",
                url,
              });
            }
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
            hwFiles.push({
              name: hw.topic ?? "Document",
              url: directHwUrl,
            });
          }

          const title =
            hw.topic ??
            hwFiles[0]?.name ??
            (isTest ? "Question Paper" : isDpp ? "DPP Practice Sheet" : "Notes");

          return (
            <div
              key={hw._id ?? `${item._id}-hw-${idx}`}
              className="card-surface p-4.5 bg-card border border-primary/20 hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 rounded-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full">
                      {isTest ? "Question Paper" : isDpp ? "DPP Study Material" : "Study Material"}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-foreground leading-snug">{title}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                    {hw.note && <span>{hw.note}</span>}
                    {item.startTime && (
                      <span suppressHydrationWarning>· {formatSimpleDate(item.startTime)}</span>
                    )}
                  </div>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/25 shrink-0 shadow-2xs">
                  <FileText className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                {hwFiles.map((f, i) => (
                  <button
                    key={`${f.url}-${i}`}
                    type="button"
                    onClick={() => onPreviewPdf?.(f)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 px-3.5 py-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 shadow-xs transition-all hover:bg-orange-500/25 hover:scale-[1.02] cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>
                      {isTest ? "Question Paper" : "Open PDF"} (
                      {f.name.length > 22 ? `${f.name.slice(0, 20)}…` : f.name})
                    </span>
                  </button>
                ))}

                {/* Watch Video Solution if available */}
                {batchId && subjectId && topicId && hasVideoSolution && solutionVideoId && (
                  <Link
                    to="/batches/$batchId/subject/$subjectId/topic/$topicId/lecture/$lectureId"
                    params={{ batchId, subjectId, topicId, lectureId: solutionVideoId }}
                    search={{ videoId: solutionVideoId, title: `Solution: ${title}` }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs shadow-primary/20 transition hover:opacity-90 hover:scale-105 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Watch Solution Video</span>
                  </Link>
                )}

                {hwFiles.length === 0 && !hasVideoSolution && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Notes not uploaded yet by instructor for this session</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const files = itemAttachments(item);
  const title =
    item.topic ??
    item.name ??
    item.homeworkIds?.[0]?.topic ??
    item.videoDetails?.name ??
    (isTest ? "Question Paper" : isDpp ? "DPP Practice Sheet" : "Notes");

  return (
    <div className="card-surface p-4.5 bg-card border border-primary/20 hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full">
              {isTest ? "Question Paper" : isDpp ? "DPP Sheet" : "Chapter Notes"}
            </span>
          </div>
          <h2 className="text-sm font-bold text-foreground leading-snug">{title}</h2>
          <p suppressHydrationWarning className="mt-1 text-xs text-muted-foreground font-medium">
            {item.startTime ? formatSimpleDate(item.startTime) : item.status}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/25 shrink-0 shadow-2xs">
          <FileText className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-border">
        {files.map((f, i) => (
          <button
            key={`${f.url}-${i}`}
            type="button"
            onClick={() => onPreviewPdf?.(f)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 px-3.5 py-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 shadow-xs transition-all hover:bg-orange-500/25 hover:scale-[1.02] cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>
              {isTest ? "Question Paper" : "Open PDF"} (
              {f.name.length > 22 ? `${f.name.slice(0, 20)}…` : f.name})
            </span>
          </button>
        ))}

        {/* Watch Solution Video button if available */}
        {batchId && subjectId && topicId && hasVideoSolution && solutionVideoId && (
          <Link
            to="/batches/$batchId/subject/$subjectId/topic/$topicId/lecture/$lectureId"
            params={{ batchId, subjectId, topicId, lectureId: solutionVideoId }}
            search={{ videoId: solutionVideoId, title: `Solution: ${title}` }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs shadow-primary/20 transition hover:opacity-90 hover:scale-105 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Watch Video Solution</span>
          </Link>
        )}

        {files.length === 0 && !hasVideoSolution && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>Notes not uploaded yet by instructor for this session</span>
          </div>
        )}
      </div>
    </div>
  );
}
