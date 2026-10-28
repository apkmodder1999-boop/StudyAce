import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, BookmarkCheck } from "lucide-react";
import { fetchBatches, type Batch } from "@/lib/api";
import { Shell, Loading, ErrorBox } from "@/components/shell";
import { useEnrollment, type EnrolledBatch } from "@/lib/enrollment-system";
import { useTheme, type ThemeColor } from "@/hooks/use-theme";

interface IndexSearch {
  tab?: "all" | "enrolled" | "batches";
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

function getGradientForBatch(batchName: string, colorScheme: ThemeColor = "yellow") {
  let hash = 0;
  const name = batchName || "PW Batch";
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  if (colorScheme === "yellow") {
    const YELLOW_PALETTES = [
      "linear-gradient(135deg, #451a03 0%, #92400e 40%, #eab308 100%)",
      "linear-gradient(135deg, #292524 0%, #854d0e 45%, #f59e0b 100%)",
      "linear-gradient(135deg, #1c1917 0%, #a16207 50%, #facc15 100%)",
      "linear-gradient(135deg, #78350f 0%, #b45309 45%, #eab308 100%)",
    ];
    return YELLOW_PALETTES[Math.abs(hash) % YELLOW_PALETTES.length];
  }

  if (colorScheme === "green") {
    const GREEN_PALETTES = [
      "linear-gradient(135deg, #052e16 0%, #14532d 40%, #7cfc00 100%)",
      "linear-gradient(135deg, #022c22 0%, #065f46 50%, #4ade80 100%)",
      "linear-gradient(135deg, #064e3b 0%, #15803d 45%, #7cfc00 100%)",
      "linear-gradient(135deg, #14532d 0%, #166534 50%, #86efac 100%)",
    ];
    return GREEN_PALETTES[Math.abs(hash) % GREEN_PALETTES.length];
  }

  if (colorScheme === "blue") {
    const BLUE_PALETTES = [
      "linear-gradient(135deg, #0c2d48 0%, #145da0 45%, #25a7da 100%)",
      "linear-gradient(135deg, #082f49 0%, #0284c7 50%, #38bdf8 100%)",
      "linear-gradient(135deg, #0f172a 0%, #0369a1 45%, #25a7da 100%)",
      "linear-gradient(135deg, #164e63 0%, #0891b2 50%, #25a7da 100%)",
    ];
    return BLUE_PALETTES[Math.abs(hash) % BLUE_PALETTES.length];
  }

  const DEFAULT_PALETTES = [
    "linear-gradient(135deg, #451a03 0%, #92400e 45%, #eab308 100%)",
    "linear-gradient(135deg, #1c1917 0%, #854d0e 50%, #facc15 100%)",
    "linear-gradient(135deg, #78350f 0%, #b45309 45%, #f59e0b 100%)",
  ];
  return DEFAULT_PALETTES[Math.abs(hash) % DEFAULT_PALETTES.length];
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    tab: search.tab === "enrolled" ? "enrolled" : "all",
  }),
  head: () => ({
    meta: [
      { title: "Physics Wallah (PW) — Official Learning Portal" },
      {
        name: "description",
        content:
          "Official PW student portal and batches for JEE, NEET, Class 11, Class 12, and Foundation exams.",
      },
      { property: "og:title", content: "Physics Wallah (PW) — Official Learning Portal" },
      {
        property: "og:description",
        content:
          "Access official batches, recorded video lectures, DPP practice sheets, and handwritten notes on Physics Wallah.",
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

  const { enrolledBatches, isEnrolled, enroll, unenroll } = useEnrollment();
  const { colorScheme } = useTheme();

  const isEnrolledTab = tab === "enrolled";

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
            text.includes("repeater") ||
            text.includes("target") ||
            text.includes("yakeen") ||
            text.includes("prayas")
          );
        }
        if (selectedCategory === "hinglish") {
          return (
            b.language?.toLowerCase().includes("hinglish") ||
            text.includes("hinglish") ||
            !b.language
          );
        }
        return true;
      });
    }

    if (!needle) return filtered;

    return filtered.filter((b) => {
      const matchName = b.name.toLowerCase().includes(needle);
      const matchExam = b.byName?.toLowerCase().includes(needle);
      const matchClass = b.class?.toString().includes(needle);
      const matchType = b.type?.toLowerCase().includes(needle);
      return matchName || matchExam || matchClass || matchType;
    });
  }, [data, query, selectedCategory]);

  const filteredEnrolled = useMemo(() => {
    const ids = new Set(enrolledBatches.map((eb) => eb._id));
    return (data ?? []).filter((b) => ids.has(b._id));
  }, [data, enrolledBatches]);

  const handleTabChange = (newTab: "all" | "enrolled") => {
    navigate({
      search: () => ({ tab: newTab }),
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

  const displayBatches = isEnrolledTab ? filteredEnrolled : batches;

  return (
    <Shell>
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* TOP TAB SWITCHER: ALL BATCHES vs MY ENROLLED BATCHES */}
        <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-card rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => handleTabChange("all")}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                !isEnrolledTab
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Batches
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("enrolled")}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                isEnrolledTab
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>My Batches</span>
              {enrolledBatches.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isEnrolledTab
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {enrolledBatches.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search batches by name, exam (JEE, NEET), class..."
            className="w-full py-2.5 pl-9 pr-10 text-xs sm:text-sm border border-border rounded-xl bg-card text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs transition"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* CATEGORY FILTER CHIPS (VISIBLE ON ALL BATCHES TAB) */}
        {!isEnrolledTab && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full max-w-full">
            {CATEGORY_CHIPS.map((chip) => {
              const active = selectedCategory === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        {/* SKELETON / LOADING */}
        {isLoading && <Loading text="Loading official PW batches…" />}
        {error && <ErrorBox message={(error as Error).message} />}

        {/* EMPTY STATE FOR MY BATCHES */}
        {!isLoading && !error && isEnrolledTab && displayBatches.length === 0 && (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card">
            <BookmarkCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-foreground">No Enrolled Batches Yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Explore the catalog and click "Enroll" on any batch to save it here for quick access.
            </p>
            <button
              type="button"
              onClick={() => handleTabChange("all")}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition cursor-pointer"
            >
              Browse All Batches &gt;
            </button>
          </div>
        )}

        {/* EMPTY STATE FOR ALL BATCHES (NO SEARCH RESULTS) */}
        {!isLoading && !error && !isEnrolledTab && displayBatches.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
            <Search className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-foreground">No Batches Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No batches match your search query or selected category filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSelectedCategory("all");
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* BATCH CARDS */}
        {!isLoading && !error && displayBatches.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {displayBatches.map((b) => {
              const enrolled = isEnrolled(b._id);
              const lang = b.language || "Hinglish";

              return (
                <article
                  key={b._id}
                  className="group rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 flex flex-col"
                >
                  {/* BATCH POSTER BANNER */}
                  <div className="relative w-full aspect-[16/9] overflow-hidden bg-muted/50 border-b border-border">
                    {b.previewImage ? (
                      <img
                        src={b.previewImage}
                        alt={b.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                      />
                    ) : (
                      <div
                        className="w-full h-full p-4 flex flex-col justify-between relative overflow-hidden"
                        style={{ background: getGradientForBatch(b.name, colorScheme) }}
                      >
                        {/* Banner Top Pills */}
                        <div className="flex items-center justify-between gap-2 z-10">
                          <span className="rounded-md bg-black/40 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs">
                            PW Batch
                          </span>
                          <span className="rounded-md bg-white/20 backdrop-blur-xs text-white border border-white/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                            {lang}
                          </span>
                        </div>

                        {/* Bold Batch Title */}
                        <div className="my-auto z-10 py-1">
                          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                            {b.name.toUpperCase()}
                          </h3>
                        </div>

                        {/* Faculty Team Labels at Banner Bottom */}
                        <div className="flex items-center justify-between gap-1.5 z-10 pt-1 border-t border-white/20">
                          <span className="text-[10px] font-extrabold text-white bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
                            PW Stars Team
                          </span>
                          <span className="text-[10px] font-extrabold text-white bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
                            Kota Legends Team
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Enrolled Badge if already enrolled */}
                    {enrolled && (
                      <div className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground font-black px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-md shadow-primary/30 z-20">
                        <BookmarkCheck className="h-3 w-3" />
                        <span>Enrolled</span>
                      </div>
                    )}
                  </div>

                  {/* CARD BODY CONTENT */}
                  <div className="p-4 flex flex-col flex-1">
                    <h2 className="text-base sm:text-lg font-extrabold text-foreground leading-snug line-clamp-1">
                      {b.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      Curated by top faculty for {b.byName || "IIT-JEE & NEET"} Aspirants. Includes
                      comprehensive video lectures, notes, and DPPs.
                    </p>

                    {/* CARD FOOTER DUAL ACTION BUTTONS */}
                    <div className="mt-auto pt-4 border-t border-border flex items-center gap-3">
                      {/* Button 1: Enroll / Enrolled */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleEnroll(e, b, enrolled)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold cursor-pointer transition flex items-center justify-center gap-1.5 ${
                          enrolled
                            ? "bg-primary/15 text-primary border border-primary/30 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                            : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                        }`}
                      >
                        <BookmarkCheck className="h-3.5 w-3.5" />
                        <span>{enrolled ? "Enrolled ✓" : "Enroll"}</span>
                      </button>

                      {/* Button 2: Let's Study */}
                      <Link
                        to="/batches/$batchId"
                        params={{ batchId: b._id }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-black text-xs cursor-pointer shadow-md shadow-primary/30 transition flex items-center justify-center gap-1.5"
                      >
                        <span>Let's Study</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
