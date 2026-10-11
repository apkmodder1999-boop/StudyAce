import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { fetchBatchDetails, subjectImage, getBatchImageUrl } from "@/lib/api";
import { Shell, Crumbs, Loading, ErrorBox, EmptyBox } from "@/components/shell";
import {
  BookOpen,
  Search,
  ArrowRight,
  User,
  BookmarkCheck,
  Check,
  Plus,
  Calendar,
  Share2,
  Award,
  Video,
  FileText,
  Info,
} from "lucide-react";
import { formatBatchDate } from "@/lib/dates";
import { useEnrollment } from "@/lib/enrollment-system";

export const Route = createFileRoute("/batches/$batchId/")({
  head: () => ({
    meta: [
      { title: "Batch Subjects — Physics Wallah (PW)" },
      {
        name: "description",
        content:
          "Explore all subjects, chapters, lectures, and DPP materials inside this official Physics Wallah batch.",
      },
      { property: "og:title", content: "Batch Subjects — Physics Wallah (PW)" },
      {
        property: "og:description",
        content:
          "Explore all subjects, chapters, lectures, and DPP materials inside this official Physics Wallah batch.",
      },
    ],
  }),
  component: BatchPage,
});

function BatchPage() {
  const { batchId } = Route.useParams();
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"classes" | "about" | "notices">("classes");
  const { isEnrolled, enroll, unenroll } = useEnrollment();

  const { data, isLoading, error } = useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => fetchBatchDetails(batchId),
  });

  const enrolled = isEnrolled(batchId);
  const allSubjects = useMemo(() => data?.subjects ?? [], [data?.subjects]);

  const filteredSubjects = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allSubjects;
    return allSubjects.filter((s) => s.subject?.toLowerCase().includes(q));
  }, [allSubjects, filter]);

  const previewImg = data ? getBatchImageUrl(data.previewImage) : undefined;

  return (
    <Shell>
      {/* PW Breadcrumbs */}
      <Crumbs
        items={[
          {
            label: "Batches",
            to: (
              <Link to="/" search={{ tab: "all" }} className="hover:text-foreground transition">
                Batches
              </Link>
            ),
          },
          { label: data?.name ?? "Batch Details" },
        ]}
      />

      {isLoading && <Loading text="Loading official PW batch details…" />}
      {error && <ErrorBox message={(error as Error).message} />}

      {!isLoading && !error && data && (
        <div className="space-y-6">
          {/* Official PW Batch Hero Header Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Left Column: Info & Details */}
              <div className="flex-1 space-y-3.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-slate-950 text-white px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                    PW OFFICIAL BATCH
                  </span>
                  <span className="rounded-md bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-bold">
                    {data.language ?? "Hinglish"}
                  </span>
                  {data.class && (
                    <span className="rounded-md bg-muted text-foreground px-2.5 py-0.5 text-[10px] font-semibold">
                      Class {data.class}
                    </span>
                  )}
                  <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold">
                    ✓ 100% FREE PASS
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {data.name}
                </h1>

                {data.byName && (
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span>Faculty: {data.byName}</span>
                  </p>
                )}

                {(data.startDate || data.endDate) && (
                  <p
                    suppressHydrationWarning
                    className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono"
                  >
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      Starts {data.startDate ? formatBatchDate(data.startDate) : "Available Now"}
                      {data.endDate ? ` • Ends ${formatBatchDate(data.endDate)}` : ""}
                    </span>
                  </p>
                )}

                {/* Primary CTA Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {enrolled ? (
                    <button
                      type="button"
                      onClick={() => unenroll(batchId)}
                      className="group inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition hover:border-destructive hover:text-destructive cursor-pointer shadow-xs"
                      title="Click to unenroll from this batch"
                    >
                      <Check className="h-4 w-4 text-primary group-hover:hidden" />
                      <span className="group-hover:hidden">Enrolled in Batch ✓</span>
                      <span className="hidden group-hover:inline">Unenroll</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        enroll({
                          _id: batchId,
                          name: data.name,
                          byName: data.byName,
                          startDate: data.startDate,
                          endDate: data.endDate,
                          previewImage: previewImg,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Enroll in Batch (Free)</span>
                    </button>
                  )}

                  <span className="text-xs text-muted-foreground">
                    Includes all {allSubjects.length} subjects & study materials
                  </span>
                </div>
              </div>

              {/* Right Column: Batch Poster */}
              {previewImg && (
                <div className="w-full sm:w-72 lg:w-80 shrink-0 aspect-video rounded-xl overflow-hidden border border-border bg-muted shadow-sm">
                  <img src={previewImg} alt={data.name} className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Official PW Batch Tabs: "All Classes", "About Batch", "Notices" */}
          <div className="border-b border-border">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("classes")}
                className={`border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === "classes"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                All Classes ({allSubjects.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("about")}
                className={`border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === "about"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Batch Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notices")}
                className={`border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === "notices"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Notices & Updates
              </button>
            </div>
          </div>

          {/* TAB 1: ALL CLASSES / SUBJECTS */}
          {activeTab === "classes" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">
                    Subjects Included in this Batch ({allSubjects.length})
                  </h2>
                </div>

                {allSubjects.length > 2 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Filter subjects…"
                      className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              {filteredSubjects.length === 0 && (
                <EmptyBox message="No subjects found in this batch." />
              )}

              {/* PW Subject Cards Grid */}
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
                      className="group card-surface flex items-center justify-between gap-4 p-4.5 bg-card border border-border transition hover:border-primary/50 hover:shadow-xs rounded-2xl"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {img ? (
                          <img
                            src={img}
                            alt={s.subject}
                            loading="lazy"
                            className="h-13 w-13 rounded-xl object-cover bg-muted flex-none border border-border"
                          />
                        ) : (
                          <div className="grid h-13 w-13 flex-none place-items-center rounded-xl bg-slate-950 text-white border border-border font-bold text-base">
                            {s.subject?.[0] ?? "S"}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary transition">
                            {s.subject}
                          </h3>
                          {teacherName ? (
                            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground font-medium">
                              <User className="h-3 w-3 text-muted-foreground flex-none" />
                              <span className="truncate">{teacherName}</span>
                            </p>
                          ) : (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Chapter lectures & notes
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-muted text-muted-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ABOUT BATCH */}
          {activeTab === "about" && (
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-base font-bold text-foreground">About this Course</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {data.description ||
                  "This batch provides a complete structured curriculum designed by Physics Wallah's top educators. Features complete syllabus coverage with concept clarity, practice problem sessions, chapter-wise notes and assignments."}
              </p>
              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <span className="text-[11px] text-muted-foreground">Mode</span>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    Online (Recorded + Live)
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <span className="text-[11px] text-muted-foreground">Medium</span>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {data.language ?? "Hinglish"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <span className="text-[11px] text-muted-foreground">Class Target</span>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {data.class ? `Class ${data.class}` : "Competitive Exams"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTICES */}
          {activeTab === "notices" && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Info className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-sm font-bold text-foreground">Official Batch Notices</h3>
              <p className="text-xs text-muted-foreground mt-1">
                All classes, DPPs, and chapter notes are available on time. Keep checking for
                updates!
              </p>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
