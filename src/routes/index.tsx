import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  BookmarkCheck,
  Check,
  Tv,
  Users,
  ChevronDown,
  Clock,
  Bookmark,
  Zap,
} from "lucide-react";
import { fetchBatches, type Batch } from "@/lib/api";
import { Shell, Loading, ErrorBox } from "@/components/shell";
import { useEnrollment, type EnrolledBatch } from "@/lib/enrollment-system";
import { useTheme, type ThemeColor } from "@/hooks/use-theme";
import { PWModal, type ModalType } from "@/components/PWModals";

interface IndexSearch {
  tab?: "study" | "batches" | "all" | "enrolled";
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

function getGradientForBatch(batchName: string, colorScheme: ThemeColor = "blue") {
  let hash = 0;
  const name = batchName || "PW Batch";
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
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
    "linear-gradient(135deg, #1e1b4b 0%, #1e40af 45%, #2563eb 100%)",
    "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #2563eb 100%)",
    "linear-gradient(135deg, #172554 0%, #1d4ed8 50%, #3b82f6 100%)",
  ];
  return DEFAULT_PALETTES[Math.abs(hash) % DEFAULT_PALETTES.length];
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    tab:
      search.tab === "batches" || search.tab === "all" || search.tab === "enrolled"
        ? (search.tab as IndexSearch["tab"])
        : "study",
  }),
  head: () => ({
    meta: [
      { title: "Physics Wallah (PW) — Official Learning Portal" },
      {
        name: "description",
        content:
          "Official PW student study zone and batches for JEE, NEET, Class 11, Class 12, and Foundation exams.",
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
  const { tab = "study" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);

  const { enrolledBatches, isEnrolled, enroll, unenroll } = useEnrollment();
  const { colorScheme } = useTheme();

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

  const handleTabChange = (newTab: "study" | "batches" | "all" | "enrolled") => {
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
      {/* ============================================================== */}
      {/* SCREEN 1: STUDY ZONE (CLEANED PER USER INSTRUCTIONS)           */}
      {/* ============================================================== */}
      {tab === "study" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* YOUR BATCH / MY BATCHES HEADER SECTION */}
          <div className="relative -mx-3.5 sm:-mx-4 -mt-3 sm:-mt-4 p-4 sm:p-5 bg-gradient-to-b from-[#13122b] to-[#1c1a3b] text-white shadow-md border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  YOUR BATCH
                </span>
                <button
                  type="button"
                  onClick={() => setIsBatchDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 text-base sm:text-lg font-black text-white hover:text-amber-400 transition cursor-pointer mt-0.5 text-left"
                >
                  <span className="truncate max-w-[260px] sm:max-w-md">
                    {enrolledBatches.length > 0 ? enrolledBatches[0].name : "MY BATCHES"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </button>
              </div>

              {enrolledBatches.length > 0 && (
                <Link
                  to="/batches/$batchId"
                  params={{ batchId: enrolledBatches[0]._id }}
                  className="rounded-xl bg-primary text-primary-foreground font-black text-xs px-3.5 py-2 shadow-md shadow-primary/30 hover:opacity-90 transition shrink-0"
                >
                  Resume Study &gt;
                </Link>
              )}
            </div>

            {/* Dropdown Menu for Enrolled Batches */}
            {isBatchDropdownOpen && (
              <div className="absolute top-full left-4 right-4 mt-2 p-2 rounded-2xl bg-card border border-border text-foreground shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Enrolled Batches ({enrolledBatches.length})
                </div>
                {enrolledBatches.length > 0 ? (
                  enrolledBatches.map((eb) => (
                    <Link
                      key={eb._id}
                      to="/batches/$batchId"
                      params={{ batchId: eb._id }}
                      onClick={() => setIsBatchDropdownOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted text-xs font-bold text-foreground transition"
                    >
                      <span className="truncate pr-2">{eb.name}</span>
                      <span className="text-[10px] text-primary shrink-0">Open &gt;</span>
                    </Link>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    <p>No active enrolled batch yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBatchDropdownOpen(false);
                        handleTabChange("batches");
                      }}
                      className="mt-1.5 font-bold text-primary hover:underline"
                    >
                      Browse All Batches &gt;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QUICK ACCESS ACTION ICONS (FOCUSED & FUNCTIONAL) */}
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 text-center">
            {/* All Classes */}
            <button
              type="button"
              onClick={() => handleTabChange("batches")}
              className="group flex flex-col items-center justify-center p-2.5 sm:p-3 transition cursor-pointer"
            >
              <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-white dark:bg-card border border-border shadow-xs flex items-center justify-center group-hover:scale-105 group-hover:border-primary/50 transition">
                <Tv className="h-6 w-6 text-rose-500" />
              </div>
              <span className="text-[11px] font-bold text-foreground mt-1.5 leading-tight">
                All Classes
              </span>
            </button>

            {/* My Batches */}
            <button
              type="button"
              onClick={() => handleTabChange("enrolled")}
              className="group flex flex-col items-center justify-center p-2.5 sm:p-3 transition cursor-pointer"
            >
              <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-white dark:bg-card border border-border shadow-xs flex items-center justify-center group-hover:scale-105 group-hover:border-primary/50 transition">
                <BookmarkCheck className="h-6 w-6 text-indigo-500" />
              </div>
              <span className="text-[11px] font-bold text-foreground mt-1.5 leading-tight">
                My Batches
              </span>
            </button>

            {/* Community (Telegram) */}
            <a
              href="https://t.me/+7htXdqnvL0JiYjc1"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center p-2.5 sm:p-3 transition cursor-pointer"
            >
              <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-white dark:bg-card border border-border shadow-xs flex items-center justify-center group-hover:scale-105 group-hover:border-primary/50 transition">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <span className="text-[11px] font-bold text-foreground mt-1.5 leading-tight">
                Community
              </span>
            </a>

            {/* XP Status */}
            <button
              type="button"
              onClick={() => setActiveModal("rewards")}
              className="group flex flex-col items-center justify-center p-2.5 sm:p-3 transition cursor-pointer"
            >
              <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-white dark:bg-card border border-border shadow-xs flex items-center justify-center group-hover:scale-105 group-hover:border-primary/50 transition">
                <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
              </div>
              <span className="text-[11px] font-bold text-foreground mt-1.5 leading-tight">
                XP Rewards
              </span>
            </button>
          </div>

          {/* MY STUDY ZONE (CLEAN 3-CARD GRID: MY BATCHES, MY HISTORY, BOOKMARKS) */}
          <div className="space-y-3 pt-2">
            <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
              My Study Zone
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Card 1: My Batches */}
              <button
                type="button"
                onClick={() => handleTabChange("enrolled")}
                className="group flex flex-col items-center justify-center p-5 rounded-2xl bg-card border border-border hover:border-primary/60 hover:shadow-lg transition cursor-pointer text-center"
              >
                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <BookmarkCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-foreground">My Batches</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {enrolledBatches.length} active enrollments
                </span>
              </button>

              {/* Card 2: My History */}
              <button
                type="button"
                onClick={() => setActiveModal("history")}
                className="group flex flex-col items-center justify-center p-5 rounded-2xl bg-card border border-border hover:border-primary/60 hover:shadow-lg transition cursor-pointer text-center"
              >
                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-foreground">My History</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Recent watch activity
                </span>
              </button>

              {/* Card 3: Bookmarks */}
              <button
                type="button"
                onClick={() => setActiveModal("bookmarks")}
                className="group flex flex-col items-center justify-center p-5 rounded-2xl bg-card border border-border hover:border-primary/60 hover:shadow-lg transition cursor-pointer text-center"
              >
                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Bookmark className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-foreground">Bookmarks</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Saved study material
                </span>
              </button>
            </div>
          </div>

          {/* MOTIVATIONAL BANNER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/60 dark:bg-card border border-border">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed">
              Padhlo chahe kahi se,
            </p>
            <p className="text-xs sm:text-sm font-extrabold text-foreground mt-0.5">
              <span className="underline decoration-primary decoration-2 underline-offset-4">
                Manzil
              </span>{" "}
              milegi yahi se...
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 2: BATCHES CATALOG                                      */}
      {/* ============================================================== */}
      {tab !== "study" && (
        <div className="space-y-4 animate-in fade-in duration-200">
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

          {/* CATEGORY FILTER CHIPS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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

          {/* SKELETON / LOADING */}
          {isLoading && <Loading text="Loading official PW batches…" />}
          {error && <ErrorBox message={(error as Error).message} />}

          {/* BATCH CARDS */}
          {!isLoading && !error && (
            <div className="grid gap-5 sm:grid-cols-2">
              {(tab === "enrolled" ? filteredEnrolled : batches).map((b) => {
                const enrolled = isEnrolled(b._id);
                const lang = b.language || "Hinglish";

                return (
                  <article
                    key={b._id}
                    className="group rounded-2xl border border-primary/20 bg-card overflow-hidden shadow-xs hover:border-primary/60 hover:shadow-xl hover:shadow-primary/15 transition-all duration-300 flex flex-col"
                  >
                    {/* BATCH POSTER BANNER */}
                    <div className="relative w-full aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#1b193d] via-[#15132d] to-[#0c0a1f]">
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
                            <span className="rounded-md bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs">
                              NextStudy
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
                        Curated by top faculty for {b.byName || "IIT-JEE & NEET"} Aspirants.
                        Includes comprehensive video lectures, notes, and DPPs.
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
      )}

      {/* Global Modals for Quick Actions */}
      <PWModal type={activeModal} onClose={() => setActiveModal(null)} />
    </Shell>
  );
}
