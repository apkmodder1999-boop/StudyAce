import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Sparkles,
  ArrowRight,
  BookmarkCheck,
  Check,
  Plus,
  BookOpen,
  Calendar,
  Layers,
  GraduationCap,
} from "lucide-react";
import { fetchBatches, type Batch } from "@/lib/api";
import { formatBatchDate, formatSimpleDate } from "@/lib/dates";
import { Shell, PageTitle, Loading, ErrorBox, EmptyBox } from "@/components/shell";
import { useEnrollment, type EnrolledBatch } from "@/lib/enrollment-system";

interface IndexSearch {
  tab?: "all" | "enrolled";
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    tab: search.tab === "enrolled" ? "enrolled" : "all",
  }),
  head: () => ({
    meta: [
      { title: "Study Ace — Premium Batches, Lectures & Study Material" },
      {
        name: "description",
        content:
          "Browse study batches, stream video lectures, enroll in batches, and access chapter notes and DPPs instantly.",
      },
      { property: "og:title", content: "Study Ace — Premium Batches, Lectures & Study Material" },
      {
        property: "og:description",
        content:
          "Browse study batches, stream video lectures, enroll in batches, and access chapter notes and DPPs instantly.",
      },
    ],
  }),
  component: BatchesPage,
});

function BatchesPage() {
  const { tab = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");

  const { enrolledBatches, enrolledCount, isEnrolled, enroll, unenroll, isMounted } =
    useEnrollment();

  const { data, isLoading, error } = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const batches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = data ?? [];
    if (!needle) return all;
    return all.filter((b) => (b.name + " " + (b.byName ?? "")).toLowerCase().includes(needle));
  }, [data, query]);

  const filteredEnrolled = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return enrolledBatches;
    return enrolledBatches.filter((b) =>
      (b.name + " " + (b.byName ?? "")).toLowerCase().includes(needle),
    );
  }, [enrolledBatches, query]);

  const handleTabChange = (newTab: "all" | "enrolled") => {
    navigate({
      search: (prev: IndexSearch) => ({ ...prev, tab: newTab }),
    });
  };

  const handleToggleEnroll = (
    e: React.MouseEvent,
    batch: Batch | EnrolledBatch,
    isCurrentlyEnrolled: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrentlyEnrolled) {
      unenroll(batch._id);
    } else {
      enroll(batch);
    }
  };

  return (
    <Shell>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
        <Sparkles className="h-3.5 w-3.5 text-sky-500" />
        <span>Study Ace Learning Platform</span>
      </div>

      <PageTitle
        title={tab === "enrolled" ? "My Enrolled Batches" : "Explore Batches"}
        subtitle={
          tab === "enrolled"
            ? "Your active enrolled batches. Pick up right where you left off with full video lectures, notes, and DPPs."
            : "Browse all completed and active study batches, stream video lectures, and access chapter notes."
        }
      />

      {/* Primary Section Switcher Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-sky-100 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => handleTabChange("all")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            tab === "all"
              ? "bg-sky-600 text-white shadow-sm shadow-sky-500/25"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-750 hover:text-sky-600 dark:hover:text-sky-300"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Batches</span>
          {data && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                tab === "all"
                  ? "bg-sky-500/80 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {data.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("enrolled")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            tab === "enrolled"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/25"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-750 hover:text-emerald-700 dark:hover:text-emerald-300"
          }`}
        >
          <BookmarkCheck className="h-3.5 w-3.5" />
          <span>Enrolled Batches</span>
          <span
            suppressHydrationWarning
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
              tab === "enrolled"
                ? "bg-emerald-500/80 text-white"
                : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
            }`}
          >
            {isMounted ? enrolledCount : 0}
          </span>
        </button>
      </div>

      {/* Quick Access Enrolled Shelf (when on 'all' tab with active enrollments) */}
      {tab === "all" && isMounted && enrolledBatches.length > 0 && (
        <div className="mb-8 rounded-2xl border border-emerald-200/90 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/70 via-sky-50/30 to-transparent dark:from-emerald-950/30 dark:via-slate-900 dark:to-transparent p-4 sm:p-5">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <BookmarkCheck className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                My Enrolled Batches ({enrolledBatches.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange("enrolled")}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              View All Enrolled →
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledBatches.slice(0, 3).map((b) => (
              <Link
                key={b._id}
                to="/batches/$batchId"
                params={{ batchId: b._id }}
                className="group flex items-center gap-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-2.5 transition hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm"
              >
                {b.previewImage ? (
                  <img
                    src={b.previewImage}
                    alt={b.name}
                    className="h-12 w-12 rounded-lg object-cover bg-emerald-50 dark:bg-slate-800 flex-none"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    {b.name}
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {b.class ? `Class ${b.class} · ` : ""}
                    {b.language ?? "Hinglish"}
                  </p>
                </div>
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Polished Search Bar */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            tab === "enrolled"
              ? "Search within your enrolled batches…"
              : "Search batches by name, class, faculty…"
          }
          className="w-full rounded-2xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5 pl-11 pr-4 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs transition hover:border-sky-200 dark:hover:border-slate-700 focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-950/50"
        />
      </div>

      {/* Enrolled Batches View */}
      {tab === "enrolled" && (
        <section>
          {isMounted && enrolledBatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sky-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-8 sm:p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No Batches Enrolled Yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                You haven't enrolled in any batches yet. Browse the catalog and tap{" "}
                <strong className="text-slate-700 dark:text-slate-200">"+ Enroll"</strong> on any
                batch to pin it to your personal learning dashboard for fast access.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => handleTabChange("all")}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-sky-500/25 transition cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Browse All Batches</span>
                </button>
              </div>
            </div>
          ) : filteredEnrolled.length === 0 ? (
            <EmptyBox message="No enrolled batches match your search filter." />
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing{" "}
                  <strong className="font-semibold text-slate-800 dark:text-slate-200">
                    {filteredEnrolled.length}
                  </strong>{" "}
                  enrolled batches
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Instant Access
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {filteredEnrolled.map((b) => (
                  <Link
                    key={b._id}
                    to="/batches/$batchId"
                    params={{ batchId: b._id }}
                    className="group card-surface flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-emerald-900/60 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-500/10 dark:hover:shadow-none"
                  >
                    <div>
                      {b.previewImage ? (
                        <div className="relative h-44 w-full overflow-hidden bg-emerald-50 dark:bg-slate-800">
                          <img
                            src={b.previewImage}
                            alt={`${b.name} batch cover`}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-102"
                          />
                          <div className="absolute left-3 top-3 rounded-md bg-emerald-600/95 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-xs flex items-center gap-1">
                            <BookmarkCheck className="h-3 w-3" />
                            <span>Enrolled</span>
                          </div>
                          {b.status && (
                            <div className="absolute right-3 top-3 rounded-md bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 shadow-sm backdrop-blur-xs">
                              {b.status}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative h-44 w-full bg-gradient-to-br from-emerald-50 to-sky-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xl">
                          <div className="absolute left-3 top-3 rounded-md bg-emerald-600/95 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                            <BookmarkCheck className="h-3 w-3" />
                            <span>Enrolled</span>
                          </div>
                          {b.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="p-5">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span>{b.language ?? "Hinglish"}</span>
                          {b.class && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span>Class {b.class}</span>
                            </>
                          )}
                          {b.enrolledAt && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span
                                suppressHydrationWarning
                                className="text-emerald-700 dark:text-emerald-400 font-semibold"
                              >
                                Enrolled {formatSimpleDate(b.enrolledAt)}
                              </span>
                            </>
                          )}
                        </div>

                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition leading-snug">
                          {b.name}
                        </h2>

                        {b.byName && (
                          <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {b.byName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-emerald-100 dark:border-slate-800 bg-emerald-50/20 dark:bg-slate-850/50 px-5 py-3.5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={(e) => handleToggleEnroll(e, b, true)}
                        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                        title="Remove from your enrolled batches"
                      >
                        Unenroll
                      </button>

                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition">
                        <span>Continue Learning</span>
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* All Batches View */}
      {tab === "all" && (
        <section>
          {isLoading && <Loading text="Loading batches list…" />}
          {error && <ErrorBox message={(error as Error).message} />}
          {!isLoading && !error && batches.length === 0 && <EmptyBox message="No batches found." />}

          {!isLoading && !error && batches.length > 0 && (
            <div className="mb-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing{" "}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">
                  {batches.length}
                </strong>{" "}
                batches
              </span>
            </div>
          )}

          {/* Batches Grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            {batches.map((b) => {
              const enrolled = isEnrolled(b._id);

              return (
                <Link
                  key={b._id}
                  to="/batches/$batchId"
                  params={{ batchId: b._id }}
                  className={`group card-surface flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900 border transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    enrolled
                      ? "border-emerald-300/80 dark:border-emerald-800/80 hover:border-emerald-400 hover:shadow-emerald-500/10"
                      : "border-sky-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-sky-100 dark:hover:shadow-none"
                  }`}
                >
                  <div>
                    {b.previewImage ? (
                      <div className="relative h-44 w-full overflow-hidden bg-sky-50 dark:bg-slate-800">
                        <img
                          src={b.previewImage}
                          alt={`${b.name} batch cover`}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-102"
                        />
                        {/* Enrolled Badge on Top Left */}
                        {enrolled && (
                          <div className="absolute left-3 top-3 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-xs flex items-center gap-1">
                            <BookmarkCheck className="h-3 w-3" />
                            <span>Enrolled</span>
                          </div>
                        )}
                        {b.status && (
                          <div className="absolute right-3 top-3 rounded-md bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 shadow-sm backdrop-blur-xs">
                            {b.status}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative h-44 w-full bg-gradient-to-br from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-xl">
                        {enrolled && (
                          <div className="absolute left-3 top-3 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                            <BookmarkCheck className="h-3 w-3" />
                            <span>Enrolled</span>
                          </div>
                        )}
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="p-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>{b.language ?? "Hinglish"}</span>
                        {b.class && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span>Class {b.class}</span>
                          </>
                        )}
                        {b.type && !b.class && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span>{(b.type ?? "").replace("_", " ")}</span>
                          </>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition leading-snug">
                        {b.name}
                      </h2>

                      {b.byName && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {b.byName}
                        </p>
                      )}

                      {(b.startDate || b.endDate) && (
                        <p
                          suppressHydrationWarning
                          className="mt-3 text-xs text-slate-400 dark:text-slate-500 font-medium"
                        >
                          {b.startDate ? formatBatchDate(b.startDate) : ""}
                          {b.endDate ? ` → ${formatBatchDate(b.endDate)}` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-sky-100/80 dark:border-slate-800/80 bg-sky-50/30 dark:bg-slate-850/50 px-5 py-3.5 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {b.feeTotal ? (
                        <span
                          suppressHydrationWarning
                          className="text-slate-400 dark:text-slate-500 line-through mr-1 font-normal"
                        >
                          ₹{b.feeTotal}
                        </span>
                      ) : null}
                      FREE ACCESS
                    </span>

                    <div className="flex items-center gap-2">
                      {/* One-Click Enroll / Enrolled Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleEnroll(e, b, enrolled)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                          enrolled
                            ? "border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            : "border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white hover:border-sky-600 dark:hover:bg-sky-600"
                        }`}
                        title={enrolled ? "Click to unenroll" : "Enroll in this batch"}
                      >
                        {enrolled ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Enrolled</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>Enroll</span>
                          </>
                        )}
                      </button>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition">
                        <span>Explore</span>
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </Shell>
  );
}
