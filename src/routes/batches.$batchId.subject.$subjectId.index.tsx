import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchBatchDetails, fetchTopics } from "@/lib/api";
import { Shell, PageTitle, Crumbs, Loading, ErrorBox, EmptyBox } from "@/components/shell";
import { ArrowRight, BookOpen, Video, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/batches/$batchId/subject/$subjectId/")({
  head: () => ({
    meta: [
      { title: "Chapters & Topics — Physics Wallah (PW)" },
      {
        name: "description",
        content:
          "Chapter-wise topics with video lectures, notes, and DPP study material on Physics Wallah.",
      },
      { property: "og:title", content: "Chapters & Topics — Physics Wallah (PW)" },
      {
        property: "og:description",
        content: "Open a chapter to watch lectures and access study materials on Physics Wallah.",
      },
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
              <Link to="/" className="hover:text-primary transition">
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
                className="hover:text-primary transition"
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
        subtitle="Select a chapter to watch video lectures, view notes, or practice DPP exercises."
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
            className="group card-surface flex items-center justify-between gap-4 p-4.5 bg-card border border-border hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 rounded-2xl"
          >
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary/15 text-xs font-black text-primary border border-border shadow-2xs">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-foreground group-hover:text-primary transition">
                  {t.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1 text-primary">
                    <Video className="h-3 w-3 text-primary" />
                    <span>{t.videos ?? 0} lectures</span>
                  </span>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{t.notes ?? 0} notes</span>
                  </span>
                  {Boolean(t.exercises) && (
                    <>
                      <span className="text-border">·</span>
                      <span className="flex items-center gap-1 text-primary">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        <span>{t.exercises} DPPs</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground shadow-xs group-hover:scale-105">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
