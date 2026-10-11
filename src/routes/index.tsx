import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight, BookmarkCheck, Check, Plus, BookOpen, X } from "lucide-react";
import { fetchBatches, type Batch } from "@/lib/api";
import { formatSimpleDate } from "@/lib/dates";
import { Shell, Loading, ErrorBox } from "@/components/shell";
import { useEnrollment, type EnrolledBatch } from "@/lib/enrollment-system";

interface IndexSearch {
  tab?: "all" | "enrolled";
}

type CategoryFilter =
  "all" | "neet" | "jee" | "class12" | "class11" | "class10" | "dropper" | "hinglish";

const CATEGORY_CHIPS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All Batches" },
  { id: "neet", label: "NEET" },
  { id: "jee", label: "JEE" },
  { id: "class12", label: "Class 12th" },
  { id: "class11", label: "Class 11th" },
  { id: "class10", label: "Class 10th & 9th" },
  { id: "dropper", label: "Dropper / Target" },
  { id: "hinglish", label: "Hinglish" },
];

const BATCH_GRADIENTS = [
  "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)", // Deep Indigo & Electric Blue
  "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #2563eb 100%)", // Royal PW Blue
  "linear-gradient(135deg, #311b92 0%, #4a148c 50%, #7b1fa2 100%)", // Deep Purple Glow
  "linear-gradient(135deg, #881337 0%, #9f1239 50%, #f43f5e 100%)", // Crimson Rose
  "linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)", // Emerald Teal
  "linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #f97316 100%)", // Solar Orange
  "linear-gradient(135deg, #172554 0%, #1e40af 50%, #3b82f6 100%)", // Sapphire Spark
];

function getGradientForBatch(batchName: string) {
  if (!batchName) return BATCH_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < batchName.length; i++) {
    hash = batchName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % BATCH_GRADIENTS.length;
  return BATCH_GRADIENTS[idx];
}

function formatCount(num: number): string {
  if (num === 0) return "0";
  if (num >= 1000) {
    const k = num / 1000;
    return (Math.round(k * 10) / 10).toFixed(1) + " k";
  }
  return num.toString();
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    tab: search.tab === "enrolled" ? "enrolled" : "all",
  }),
  head: () => ({
    meta: [
      { title: "Batches — Eduzex · Physics Wallah" },
      {
        name: "description",
        content:
          "Explore online and offline batches for JEE, NEET, Class 11, Class 12, and Foundation exams on Eduzex.",
      },
      {
        property: "og:title",
        content: "Batches — Eduzex · Physics Wallah",
      },
      {
        property: "og:description",
        content:
          "Explore online and offline batches for JEE, NEET, Class 11, Class 12, and Foundation exams on Eduzex.",
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");

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
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const batches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = data ?? [];

    let filtered = all;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((b) => {
        const text = `${b.name} ${b.byName ?? ""} ${b.class ?? ""} ${b.type ?? ""}`.toLowerCase();
        if (selectedCategory === "neet") {
          return text.includes("neet") || text.includes("yakeen") || text.includes("medical");
        }
        if (selectedCategory === "jee") {
          return (
            text.includes("jee") ||
            text.includes("iit") ||
            text.includes("prayas") ||
            text.includes("arjuna") ||
            text.includes("lakshya")
          );
        }
        if (selectedCategory === "class12") {
          return b.class === "12" || text.includes("12th") || text.includes("class 12");
        }
        if (selectedCategory === "class11") {
          return b.class === "11" || text.includes("11th") || text.includes("class 11");
        }
        if (selectedCategory === "class10") {
          return (
            b.class === "10" ||
            b.class === "9" ||
            text.includes("10th") ||
            text.includes("9th") ||
            text.includes("foundation") ||
            text.includes("udaan")
          );
        }
        if (selectedCategory === "dropper") {
          return (
            text.includes("dropper") ||
            text.includes("target") ||
            text.includes("yakeen") ||
            text.includes("prayas") ||
            text.includes("repeater")
          );
        }
        if (selectedCategory === "hinglish") {
          return (b.language ?? "").toLowerCase().includes("hinglish") || text.includes("hinglish");
        }
        return true;
      });
    }

    if (!needle) return filtered;
    return filtered.filter((b) => (b.name + " " + (b.byName ?? "")).toLowerCase().includes(needle));
  }, [data, query, selectedCategory]);

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
      {/* SEARCH BAR (EXACT MATCH TO USER TEMPLATE) */}
      <div className="mb-5 relative">
        <div className="relative flex items-center w-full">
          <span className="pointer-events-none absolute left-4 text-[#94a3b8]">
            <Search className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search batches by name, exam (JEE, NEET), class..."
            className="w-full py-[13px] pl-[46px] pr-[44px] text-[14.5px] border-[1.5px] border-[#cbd5e1] dark:border-slate-700 rounded-xl bg-card text-foreground outline-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] focus:border-primary focus:ring-3 focus:ring-primary/20 transition-all"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3.5 h-6 w-6 rounded-full bg-[#e2e8f0] dark:bg-slate-700 text-[#475569] dark:text-slate-200 flex items-center justify-center text-xs font-bold hover:bg-[#cbd5e1] transition cursor-pointer"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* HEADING BAR WITH GREEN BOARD COUNT BADGE */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[23px] font-extrabold tracking-[-0.03em] text-[#111827] dark:text-slate-100 flex items-center gap-2.5">
            <span>{tab === "enrolled" ? "My Enrolled Batches" : "All Batches"}</span>
            <span className="green-board">
              {tab === "enrolled"
                ? isMounted
                  ? formatCount(filteredEnrolled.length)
                  : "0"
                : formatCount(batches.length)}
            </span>
          </h1>
        </div>

        {/* Tab Controls: All Batches / My Batches */}
        <div className="inline-flex rounded-xl bg-muted p-1 border border-border shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              tab === "all"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>All Batches</span>
            {data && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 font-mono tabular-nums text-[10px] font-bold text-primary">
                {data.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("enrolled")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              tab === "enrolled"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
            <span>Enrolled</span>
            <span
              suppressHydrationWarning
              className="rounded-full bg-primary/10 px-1.5 py-0.2 font-mono tabular-nums text-[10px] font-bold text-primary"
            >
              {isMounted ? enrolledCount : 0}
            </span>
          </button>
        </div>
      </div>

      <span className="block text-[13px] text-[#64748b] font-medium -mt-1.5 mb-3.5">
        {tab === "enrolled"
          ? "Your active enrolled batches with full lecture access, notes and DPPs."
          : `Showing active session batches with recorded lectures, handwritten notes & DPPs.`}
      </span>

      {/* QUICK FILTER CHIPS (MATCHING SCREENSHOT) */}
      {tab === "all" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3.5 mb-3.5 scrollbar-none">
          {CATEGORY_CHIPS.map((chip) => {
            const active = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedCategory(chip.id)}
                className={`whitespace-nowrap px-4 py-[7px] rounded-[24px] text-[13px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  active
                    ? "bg-[#111827] text-white border-[#111827] shadow-[0_3px_8px_rgba(17,24,39,0.2)] dark:bg-blue-600 dark:border-blue-600"
                    : "border border-[#cbd5e1] dark:border-slate-700 bg-card text-[#334155] dark:text-slate-300 hover:border-[#94a3b8] hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {/* SKELETON / LOADING STATE */}
      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[18px] border border-border bg-card overflow-hidden shadow-xs flex flex-col"
            >
              <div className="aspect-video w-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-3/5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <ErrorBox message={(error as Error).message} />}

      {/* EMPTY STATE */}
      {!isLoading &&
        !error &&
        (tab === "all" ? batches.length === 0 : filteredEnrolled.length === 0) && (
          <div className="text-center py-16 px-5 bg-card border border-dashed border-[#cbd5e1] dark:border-slate-700 rounded-[18px] my-5">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-extrabold text-[#111827] dark:text-slate-100 mb-1.5">
              {tab === "enrolled" ? "No Enrolled Batches Found" : "No Batches Found"}
            </h3>
            <p className="text-[13.5px] text-[#64748b] mb-4 max-w-sm mx-auto">
              {tab === "enrolled"
                ? "Browse all batches and click 'Enroll Now' to save them here."
                : "Try searching for terms like 'Arjuna', 'Lakshya', 'JEE', or 'NEET'."}
            </p>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSelectedCategory("all");
                if (tab === "enrolled") handleTabChange("all");
              }}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition cursor-pointer shadow-xs"
            >
              Reset Search
            </button>
          </div>
        )}

      {/* BATCHES GRID (MATCHING USER SCREENSHOT CARD FORMAT) */}
      {!isLoading && !error && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(tab === "enrolled" ? filteredEnrolled : batches).map((b) => {
            const enrolled = isEnrolled(b._id);
            const category = b.class ? `Class ${b.class}` : b.type?.replace("_", " ") || "PW Batch";
            const lang = b.language || "Hinglish";
            const examName = b.byName || "Academic & Competitive";
            const startDateText = b.startDate
              ? `Started on ${b.startDate.split("T")[0]}`
              : "Ongoing Session";

            return (
              <article
                key={b._id}
                className="group rounded-[18px] border border-[#e2e8f0] dark:border-slate-800 bg-card overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 flex flex-col relative"
              >
                {/* Banner Area */}
                <div className="relative w-full bg-[#0f172a] overflow-hidden rounded-t-[18px]">
                  {b.previewImage ? (
                    <img
                      src={b.previewImage}
                      alt={b.name}
                      loading="lazy"
                      className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div
                      className="dynamic-batch-banner"
                      style={{ background: getGradientForBatch(b.name) }}
                    >
                      <div className="relative z-10 flex items-center justify-between gap-1.5 mt-5">
                        <span className="text-[10px] font-extrabold tracking-wider text-white bg-black/25 backdrop-blur-xs px-2 py-0.5 rounded-full uppercase border border-white/20">
                          PHYSICS WALLAH
                        </span>
                        <span className="text-[#fde047] text-[11px] font-extrabold">
                          ★ OFFICIAL
                        </span>
                      </div>
                      <div className="relative z-10 my-auto py-1">
                        <div
                          className="text-[16px] font-black text-white leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] line-clamp-2"
                          title={b.name}
                        >
                          {b.name}
                        </div>
                      </div>
                      <div className="relative z-10 flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold text-white bg-white/22 backdrop-blur-xs px-2 py-0.5 rounded-[10px] border border-white/30 uppercase tracking-wide">
                          ⚡ {category}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Banner Top Pill ("👑 Multiple plans inside" per screenshot) */}
                  <div className="absolute top-2.5 left-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-bold text-[#1e293b] dark:text-slate-200 flex items-center gap-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
                    <span className="text-[#eab308]">👑</span>
                    <span>Multiple plans inside</span>
                  </div>

                  {enrolled && (
                    <div className="absolute top-2.5 right-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-primary flex items-center gap-1 shadow-xs border border-primary/25">
                      <BookmarkCheck className="h-3 w-3" />
                      <span>Enrolled</span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[12.5px] font-bold text-[#ea580c] uppercase tracking-[0.3px]">
                      {category}
                    </span>
                    <span className="text-[11px] font-extrabold text-[#334155] dark:text-slate-300 bg-[#f1f5f9] dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700 px-2 py-0.5 rounded-[6px] uppercase tracking-[0.5px]">
                      {lang}
                    </span>
                  </div>

                  <h2
                    className="text-[16.5px] font-extrabold text-[#0f172a] dark:text-slate-100 leading-[1.35] mb-2.5 line-clamp-2 min-h-[44px]"
                    title={b.name}
                  >
                    {b.name}
                  </h2>

                  <div className="flex items-center gap-1.5 text-[12.5px] text-[#64748b] mb-1.5 truncate">
                    <span className="text-sm">📖</span>
                    <span className="truncate">{examName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[12.5px] text-[#64748b] mb-4">
                    <span className="h-[7px] w-[7px] rounded-full bg-[#10b981] shrink-0" />
                    <span>Ongoing | {startDateText}</span>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-auto pt-3.5 border-t border-[#f1f5f9] dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="text-[18px] font-extrabold text-[#0f172a] dark:text-slate-100 flex items-baseline gap-1.5">
                        <span>Free</span>
                        <span className="text-[12px] font-semibold text-[#94a3b8] line-through">
                          {b.feeTotal ? `₹${b.feeTotal}` : "₹1,999"}
                        </span>
                      </div>
                      <span className="text-[11.5px] font-extrabold text-[#10b981]">100% OFF</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleEnroll(e, b, enrolled)}
                        className={`px-4 py-2 rounded-[10px] text-[13.5px] font-bold font-inherit cursor-pointer flex items-center gap-1.5 transition-all ${
                          enrolled
                            ? "bg-slate-200 dark:bg-slate-700 text-[#0f172a] dark:text-slate-100 hover:bg-rose-100 hover:text-rose-600"
                            : "bg-[#111827] dark:bg-primary text-white dark:text-primary-foreground hover:bg-[#1e293b] dark:hover:opacity-90 hover:scale-[1.02]"
                        }`}
                      >
                        {enrolled ? "Enrolled ✓" : "Enroll Now"}
                      </button>

                      <Link
                        to="/batches/$batchId"
                        params={{ batchId: b._id }}
                        className="h-[38px] w-[38px] rounded-[10px] border-[1.5px] border-[#cbd5e1] dark:border-slate-700 bg-card text-[#111827] dark:text-slate-100 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-[#94a3b8] transition cursor-pointer"
                        title="View Batch Details"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
