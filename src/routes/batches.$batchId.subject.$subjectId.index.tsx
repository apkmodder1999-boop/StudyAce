import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchBatchDetails, fetchTopics } from "@/lib/api";
import { Shell, PageTitle, Crumbs, Loading, ErrorBox, EmptyBox } from "@/components/shell";
import { ArrowRight, BookOpen, Video, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/batches/$batchId/subject/$subjectId/")({
  head: () => ({
    meta: [
      { title: "Chapters & Topics — Study Ace" },
      {
        name: "description",
        content: "Chapter-wise topics with video lectures, notes, DPPs and tests.",
      },
      { property: "og:title", content: "Chapters & Topics — Study Ace" },
      { property: "og:description", content: "Open a chapter to watch lectures or download PDFs." },
    ],
  }),
  component: SubjectPage,
});

function SubjectPage() {
  const { batchId, subjectId } = Route.useParams();
  const batch = useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => fetchBatchDetails(batchId),
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ["topics", batchId, subjectId],
    queryFn: () => fetchTopics(batchId, subjectId),
  });

  const subject = batch.data?.subjects?.find((s) => s._id === subjectId);
  const topics = data ?? [];

  return (
    <Shell>
      <Crumbs
        items={[
          {
            label: "Batches",
            to: (
              <Link to="/" className="hover:text-sky-600 transition">
                Batches
              </Link>
            ),
          },
          {
            label: batch.data?.name ?? "Batch",
            to: (
              <Link
                to="/batches/$batchId"
                params={{ batchId }}
                className="hover:text-sky-600 transition"
              >
                {batch.data?.name ?? "Batch"}
              </Link>
            ),
          },
          { label: subject?.subject ?? "Subject" },
        ]}
      />
      <PageTitle
        title={subject?.subject ?? "Chapters"}
        subtitle="Select a chapter to watch video lectures, download notes, or attempt DPP tests."
      />

      {isLoading && <Loading text="Loading chapters…" />}
      {error && <ErrorBox message={(error as Error).message} />}
      {!isLoading && !error && topics.length === 0 && (
        <EmptyBox message="No chapters published yet for this subject." />
      )}

      <div className="grid gap-3.5 sm:grid-cols-2">
        {topics.map((t, idx) => (
          <Link
            key={t._id}
            to="/batches/$batchId/subject/$subjectId/topic/$topicId"
            params={{ batchId, subjectId, topicId: t._id }}
            search={{ name: t.name, slug: t.slug }}
            className="group card-surface flex items-center justify-between gap-4 p-4.5 bg-white transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md hover:shadow-sky-100"
          >
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-sky-50 text-xs font-bold text-sky-700 border border-sky-100">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-slate-900 group-hover:text-sky-600 transition">
                  {t.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3 text-sky-500" />
                    <span>{t.videos ?? 0} lectures</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-slate-400" />
                    <span>{t.notes ?? 0} notes</span>
                  </span>
                  {Boolean(t.exercises) && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>{t.exercises} DPPs</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition group-hover:bg-sky-600 group-hover:text-white">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
