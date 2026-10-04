import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, ArrowRight } from "lucide-react";
import { fetchBatches } from "@/lib/api";
import { Shell, PageTitle, Loading, ErrorBox, EmptyBox } from "@/components/shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Study Ace — Premium Batches, Lectures & Study Material" },
      {
        name: "description",
        content:
          "Browse study batches, stream video lectures, and download chapter notes and DPPs instantly.",
      },
      { property: "og:title", content: "Study Ace — Premium Batches, Lectures & Study Material" },
      {
        property: "og:description",
        content:
          "Browse study batches, stream video lectures, and download chapter notes and DPPs instantly.",
      },
    ],
  }),
  component: BatchesPage,
});

const PAGE = 24;

function formatBatchDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function BatchesPage() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const { data, isLoading, error } = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setVisible(PAGE);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = data ?? [];
    if (!needle) return all;
    return all.filter((b) => (b.name + " " + (b.byName ?? "")).toLowerCase().includes(needle));
  }, [data, query]);

  const batches = filtered.slice(0, visible);

  return (
    <Shell>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-600">
        <Sparkles className="h-3.5 w-3.5 text-sky-500" />
        <span>Study Ace Batches</span>
      </div>
      <PageTitle
        title="Explore Batches"
        subtitle="Browse all completed and active batches, full lectures, notes, and DPPs."
      />

      {/* Polished Search Bar with Sky Accent */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search batches by name, class, faculty…"
          className="w-full rounded-2xl border border-sky-100 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition hover:border-sky-200 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100"
        />
      </div>

      {isLoading && <Loading text="Loading batches list…" />}
      {error && <ErrorBox message={(error as Error).message} />}
      {!isLoading && !error && filtered.length === 0 && <EmptyBox message="No batches found." />}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="font-semibold text-slate-800">{batches.length}</strong> of{" "}
            <strong className="font-semibold text-slate-800">
              {filtered.length.toLocaleString("en-IN")}
            </strong>{" "}
            batches
          </span>
        </div>
      )}

      {/* Batches Grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        {batches.map((b) => (
          <Link
            key={b._id}
            to="/batches/$batchId"
            params={{ batchId: b._id }}
            className="group card-surface flex flex-col justify-between overflow-hidden bg-white transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md hover:shadow-sky-100"
          >
            <div>
              {b.previewImage ? (
                <div className="relative h-44 w-full overflow-hidden bg-sky-50">
                  <img
                    src={b.previewImage}
                    alt={`${b.name} batch cover`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-102"
                  />
                  {b.status && (
                    <div className="absolute right-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-bold text-sky-700 shadow-sm backdrop-blur-xs">
                      {b.status}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-44 w-full bg-gradient-to-br from-sky-50 to-sky-100 flex items-center justify-center text-sky-600 font-bold text-xl">
                  {b.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="p-5">
                {/* Clean unboxed metadata per Frontend Design Constitution */}
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span>{b.language ?? "Hinglish"}</span>
                  {b.class && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>Class {b.class}</span>
                    </>
                  )}
                  {b.type && !b.class && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{(b.type ?? "").replace("_", " ")}</span>
                    </>
                  )}
                </div>

                <h2 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition leading-snug">
                  {b.name}
                </h2>

                {b.byName && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                    {b.byName}
                  </p>
                )}

                {(b.startDate || b.endDate) && (
                  <p className="mt-3 text-xs text-slate-400 font-medium">
                    {b.startDate ? formatBatchDate(b.startDate) : ""}
                    {b.endDate ? ` → ${formatBatchDate(b.endDate)}` : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-sky-100/80 bg-sky-50/30 px-5 py-3.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600">
                {b.feeTotal ? (
                  <span className="text-slate-400 line-through mr-1 font-normal">
                    ₹{b.feeTotal?.toLocaleString("en-IN")}
                  </span>
                ) : null}
                FREE ACCESS
              </span>

              <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 group-hover:text-sky-700 transition">
                <span>Explore Batch</span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {visible < filtered.length && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-white px-6 py-3 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-50 hover:border-sky-300"
          >
            Load More Batches
          </button>
        </div>
      )}
    </Shell>
  );
}
