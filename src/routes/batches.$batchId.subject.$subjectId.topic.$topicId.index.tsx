import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  FileText,
  Clock,
  HelpCircle,
  Award,
  Play,
  Calendar,
  BookOpen,
  AlertCircle,
  Terminal,
  RefreshCw,
  Eye,
  CheckCircle2,
} from "lucide-react";
import {
  fetchTopicContent,
  itemAttachments,
  attachmentUrl,
  extractVideoId,
  type ContentItem,
  type ContentType,
} from "@/lib/api";
import { Shell, Crumbs, PageTitle, Loading, EmptyBox } from "@/components/shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TABS: { key: ContentType; label: string }[] = [
  { key: "Videos", label: "Lectures" },
  { key: "notes", label: "Notes" },
  { key: "DppNotes", label: "DPPs" },
  { key: "Test", label: "Tests" },
];

export const Route = createFileRoute("/batches/$batchId/subject/$subjectId/topic/$topicId/")({
  head: () => ({
    meta: [
      { title: "Chapter Content — Study Ace" },
      {
        name: "description",
        content: "Watch lectures, view chapter notes, and access DPPs on Study Ace.",
      },
      { property: "og:title", content: "Chapter Content — Study Ace" },
      {
        property: "og:description",
        content: "Watch lectures, view chapter notes, and access DPPs on Study Ace.",
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
      : name?.toLowerCase().includes("dpp")
        ? "DppNotes"
        : "Videos";
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

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer " +
              (tab === t.key
                ? "bg-sky-600 text-white shadow-sm shadow-sky-500/25"
                : "border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300")
            }
          >
            {t.label}
          </button>
        ))}
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
              onClick={() => setIsApiModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-2"
            >
              <Terminal className="h-3.5 w-3.5 text-primary" />
              Inspect Endpoint & Response
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
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

      <div className="grid gap-3">
        {items.map((item, i) => {
          if (tab === "Videos") {
            return (
              <VideoRow
                key={`${item._id}-${i}`}
                item={item}
                batchId={batchId}
                subjectId={subjectId}
                topicId={topicId}
              />
            );
          }
          if (tab === "Test") {
            return (
              <TestCard
                key={`${item._id}-${i}`}
                item={item}
                batchId={batchId}
                subjectId={subjectId}
                topicId={topicId}
                onPreviewPdf={(pdf) => setPreviewPdf(pdf)}
              />
            );
          }
          return (
            <DocRow
              key={`${item._id}-${i}`}
              item={item}
              onPreviewPdf={(pdf) => setPreviewPdf(pdf)}
            />
          );
        })}
      </div>

      {/* PDF In-App Preview Dialog */}
      <Dialog open={!!previewPdf} onOpenChange={(open) => !open && setPreviewPdf(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-4 sm:p-6 flex flex-col gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border dark:border-slate-800">
            <div className="min-w-0 flex-1 pr-4">
              <DialogTitle className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                {previewPdf?.name ?? "PDF Document"}
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

function VideoRow({
  item,
  batchId,
  subjectId,
  topicId,
}: {
  item: ContentItem;
  batchId: string;
  subjectId: string;
  topicId: string;
}) {
  const thumb = item.videoDetails?.image;

  return (
    <div className="card-surface group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 transition hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-md hover:shadow-sky-100 dark:hover:shadow-none">
      <Link
        to="/batches/$batchId/subject/$subjectId/topic/$topicId/lecture/$lectureId"
        params={{ batchId, subjectId, topicId, lectureId: item._id }}
        className="flex items-center gap-4 min-w-0 flex-1"
      >
        {thumb ? (
          <div className="relative h-20 w-32 flex-none overflow-hidden rounded-xl bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-800">
            <img
              src={thumb}
              alt={item.topic ?? "Lecture"}
              loading="lazy"
              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-sky-950/20 opacity-0 transition duration-200 group-hover:opacity-100">
              <Play className="h-6 w-6 fill-current text-white drop-shadow" />
            </div>
          </div>
        ) : (
          <div className="grid h-20 w-32 flex-none place-items-center rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-900 border border-sky-100 dark:border-slate-800 text-sky-600 dark:text-sky-400 transition duration-200 group-hover:scale-105">
            <Play className="h-6 w-6 fill-current" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100 transition group-hover:text-sky-600 dark:group-hover:text-sky-400">
            {item.topic ?? item.videoDetails?.name ?? item.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {item.videoDetails?.duration && <span>{item.videoDetails.duration}</span>}
            {item.status && !item.videoDetails?.duration && <span>{item.status}</span>}
            {item.startTime && <span>· {new Date(item.startTime).toLocaleDateString()}</span>}
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-sky-600 dark:text-sky-400 font-semibold text-[11px]">
              HD Stream
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2 self-end sm:self-center pr-1">
        <Link
          to="/batches/$batchId/subject/$subjectId/topic/$topicId/lecture/$lectureId"
          params={{ batchId, subjectId, topicId, lectureId: item._id }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 cursor-pointer"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>Play Video</span>
        </Link>
      </div>
    </div>
  );
}

function TestCard({
  item,
  batchId,
  subjectId,
  topicId,
  onPreviewPdf,
}: {
  item: ContentItem;
  batchId: string;
  subjectId: string;
  topicId: string;
  onPreviewPdf?: (pdf: { name: string; url: string }) => void;
}) {
  const title = item.name ?? item.topic ?? "Online Test";
  const files = itemAttachments(item);
  const questions = item.totalQuestions ?? 0;
  const marks = item.totalMarks ?? 0;
  const duration = item.maxDuration ?? 60;
  const mode = item.modeType ?? "Online";

  const isVideoItem =
    item.isVideoLecture || !!item.videoDetails?.videoUrl || !!extractVideoId(item.url);

  return (
    <div className="card-surface p-4.5 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 transition hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-md hover:shadow-sky-100 dark:hover:shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-sky-600 dark:text-sky-400 uppercase tracking-wider text-[10px]">
              {mode} Test
            </span>
            {item.type && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">{item.type}</span>
              </>
            )}
          </div>

          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {title}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
            {questions > 0 && (
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-sky-500" />
                <span>{questions} Questions</span>
              </div>
            )}
            {marks > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span>{marks} Marks</span>
              </div>
            )}
            {duration > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <Clock className="h-3.5 w-3.5 text-sky-500" />
                <span>{duration} Mins</span>
              </div>
            )}
            {item.startTime && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{new Date(item.startTime).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {item.infoMessage && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              {item.infoMessage}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {isVideoItem ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                to="/batches/$batchId/subject/$subjectId/topic/$topicId/lecture/$lectureId"
                params={{ batchId, subjectId, topicId, lectureId: item._id }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 flex-1 sm:flex-initial cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Watch Solution</span>
              </Link>
            </div>
          ) : null}

          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <div key={`${f.url}-${i}`} className="inline-flex items-center gap-1">
                  {onPreviewPdf && (
                    <button
                      type="button"
                      onClick={() => onPreviewPdf(f)}
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-200 dark:border-slate-800 bg-sky-50/70 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 transition hover:bg-sky-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Eye className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                      <span>
                        {f.name.toLowerCase().endsWith(".pdf") ? "Question Paper" : f.name}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocRow({
  item,
  onPreviewPdf,
}: {
  item: ContentItem;
  onPreviewPdf?: (pdf: { name: string; url: string }) => void;
}) {
  const homeworks =
    item.homeworkIds?.filter((h) => (h.attachmentIds && h.attachmentIds.length > 0) || h.topic) ??
    [];

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

          const title = hw.topic ?? hwFiles[0]?.name ?? "Notes";

          return (
            <div
              key={hw._id ?? `${item._id}-hw-${idx}`}
              className="card-surface p-4.5 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 transition hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-md hover:shadow-sky-100 dark:hover:shadow-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {hw.note && <span>{hw.note}</span>}
                    {item.startTime && (
                      <span>· {new Date(item.startTime).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-slate-700 shrink-0">
                  <BookOpen className="h-4 w-4" />
                </div>
              </div>

              {hwFiles.length > 0 ? (
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  {hwFiles.map((f, i) => (
                    <div key={`${f.url}-${i}`} className="inline-flex items-center gap-1.5">
                      {onPreviewPdf && (
                        <button
                          type="button"
                          onClick={() => onPreviewPdf(f)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{f.name.toLowerCase().endsWith(".pdf") ? "Open PDF" : f.name}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>Notes not uploaded yet by instructor for this session</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const files = itemAttachments(item);
  const title =
    item.topic ?? item.name ?? item.homeworkIds?.[0]?.topic ?? item.videoDetails?.name ?? "Notes";

  return (
    <div className="card-surface p-4.5 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 transition hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-md hover:shadow-sky-100 dark:hover:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {item.startTime ? new Date(item.startTime).toLocaleDateString() : item.status}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-slate-700 shrink-0">
          <BookOpen className="h-4 w-4" />
        </div>
      </div>

      {files.length > 0 ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {files.map((f, i) => (
            <div key={`${f.url}-${i}`} className="inline-flex items-center gap-1.5">
              {onPreviewPdf && (
                <button
                  type="button"
                  onClick={() => onPreviewPdf(f)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{f.name.toLowerCase().endsWith(".pdf") ? "Open PDF" : f.name}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>Notes not uploaded yet by instructor for this session</span>
        </div>
      )}
    </div>
  );
}
