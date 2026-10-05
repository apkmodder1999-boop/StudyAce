import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { fetchBatchDetails, subjectImage } from "@/lib/api";
import { Shell, PageTitle, Crumbs, Loading, ErrorBox, EmptyBox } from "@/components/shell";
import { BookOpen, Search, ArrowRight, User } from "lucide-react";

export const Route = createFileRoute("/batches/$batchId/")({
  head: () => ({
    meta: [
      { title: "Batch Subjects — Study Ace" },
      {
        name: "description",
        content: "Explore all subjects, chapters, lectures, and DPP materials inside this batch.",
      },
      { property: "og:title", content: "Batch Subjects — Study Ace" },
      {
        property: "og:description",
        content: "Explore all subjects, chapters, lectures, and DPP materials inside this batch.",
      },
    ],
  }),
  component: BatchPage,
});

function BatchPage() {
  const { batchId } = Route.useParams();
  const [filter, setFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => fetchBatchDetails(batchId),
  });

  const allSubjects = useMemo(() => data?.subjects ?? [], [data?.subjects]);

  const filteredSubjects = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allSubjects;
    return allSubjects.filter((s) => s.subject?.toLowerCase().includes(q));
  }, [allSubjects, filter]);

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
          { label: data?.name ?? "Batch" },
        ]}
      />

      <PageTitle
        title={data?.name ?? "Batch Subjects"}
        subtitle={
          data?.byName ??
          "Select a subject below to explore chapters, watch video lectures, and access study materials."
        }
      />

      {isLoading && <Loading text="Loading batch subjects…" />}
      {error && <ErrorBox message={(error as Error).message} />}

      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Subjects Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-sky-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-slate-800">
                Subjects Available ({allSubjects.length})
              </span>
            </div>

            {allSubjects.length > 3 && (
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter subjects…"
                  className="w-full rounded-xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus:border-sky-300 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950"
                />
              </div>
            )}
          </div>

          {filteredSubjects.length === 0 && <EmptyBox message="No subjects found in this batch." />}

          {/* Subjects Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((s) => {
              const img = subjectImage(s);
              const teacher = s.teacherIds?.[0];
              const teacherName =
                typeof teacher === "string"
                  ? teacher
                  : teacher?.firstName
                    ? `${teacher.firstName} ${teacher.lastName ?? ""}`.trim()
                    : undefined;

              return (
                <Link
                  key={s._id}
                  to="/batches/$batchId/subject/$subjectId"
                  params={{ batchId, subjectId: s._id }}
                  className="group card-surface flex items-center justify-between gap-4 p-4.5 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 transition hover:-translate-y-0.5 hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-md hover:shadow-sky-100 dark:hover:shadow-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {img ? (
                      <img
                        src={img}
                        alt={s.subject}
                        loading="lazy"
                        className="h-13 w-13 rounded-xl object-cover bg-sky-50 dark:bg-slate-800 flex-none border border-sky-100 dark:border-slate-800"
                      />
                    ) : (
                      <div className="grid h-13 w-13 flex-none place-items-center rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-900 border border-sky-100 dark:border-slate-800 text-sky-700 dark:text-sky-400 font-bold text-base">
                        {s.subject?.[0] ?? "S"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                        {s.subject}
                      </h2>
                      {teacherName && (
                        <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <User className="h-3 w-3 text-slate-400 dark:text-slate-500 flex-none" />
                          <span className="truncate">{teacherName}</span>
                        </p>
                      )}
                      {!teacherName && (
                        <p className="mt-1 text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                          Tap to view chapters
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 transition group-hover:bg-sky-600 group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}
