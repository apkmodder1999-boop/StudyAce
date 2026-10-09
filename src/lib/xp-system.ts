import { useEffect, useState, useCallback } from "react";

export interface UserXPState {
  totalXp: number;
  totalWatchSeconds: number;
  todayXp: number;
  lastActiveDate: string; // YYYY-MM-DD
  streakDays: number;
  unclaimedSeconds: number; // Seconds watched towards the next 120s chunk
}

export interface LevelInfo {
  level: number;
  title: string;
  badge: string;
  minXp: number;
  maxXp: number;
  progressPercent: number;
  xpNeededForNext: number;
}

const STORAGE_KEY = "pw_study_xp_v1";
const SECONDS_PER_XP = 120; // 2 minutes = 1 XP per PW XP rules

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function calculateLevel(totalXp: number): LevelInfo {
  const tiers = [
    { level: 1, title: "Aspirant", badge: "🌱", minXp: 0, maxXp: 10 },
    { level: 2, title: "Scholar", badge: "📚", minXp: 10, maxXp: 25 },
    { level: 3, title: "Focused Achiever", badge: "⚡", minXp: 25, maxXp: 50 },
    { level: 4, title: "Master Student", badge: "🎯", minXp: 50, maxXp: 100 },
    { level: 5, title: "Rank Booster", badge: "🔥", minXp: 100, maxXp: 200 },
    { level: 6, title: "Top Ranker", badge: "👑", minXp: 200, maxXp: 350 },
    { level: 7, title: "AIR 1 Contender", badge: "🏆", minXp: 350, maxXp: 1000 },
  ];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (totalXp < tier.maxXp || i === tiers.length - 1) {
      const span = tier.maxXp - tier.minXp;
      const currentInTier = Math.max(0, totalXp - tier.minXp);
      const progressPercent = Math.min(100, Math.round((currentInTier / span) * 100));
      const xpNeededForNext = Math.max(0, tier.maxXp - totalXp);

      return {
        level: tier.level,
        title: tier.title,
        badge: tier.badge,
        minXp: tier.minXp,
        maxXp: tier.maxXp,
        progressPercent,
        xpNeededForNext,
      };
    }
  }

  return {
    level: 7,
    title: "AIR 1 Contender",
    badge: "🏆",
    minXp: 350,
    maxXp: 1000,
    progressPercent: 100,
    xpNeededForNext: 0,
  };
}

export function getXpState(): UserXPState {
  if (typeof window === "undefined") {
    return {
      totalXp: 0,
      totalWatchSeconds: 0,
      todayXp: 0,
      lastActiveDate: getTodayString(),
      streakDays: 1,
      unclaimedSeconds: 0,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const today = getTodayString();
    if (!raw) {
      const initial: UserXPState = {
        totalXp: 0,
        totalWatchSeconds: 0,
        todayXp: 0,
        lastActiveDate: today,
        streakDays: 1,
        unclaimedSeconds: 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw) as UserXPState;

    // Reset today's XP if date changed & check streak
    if (parsed.lastActiveDate !== today) {
      const prevDate = new Date(parsed.lastActiveDate);
      const currDate = new Date(today);
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      parsed.todayXp = 0;
      parsed.lastActiveDate = today;
      if (diffDays === 1) {
        parsed.streakDays += 1;
      } else if (diffDays > 1) {
        parsed.streakDays = 1;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch {
    return {
      totalXp: 0,
      totalWatchSeconds: 0,
      todayXp: 0,
      lastActiveDate: getTodayString(),
      streakDays: 1,
      unclaimedSeconds: 0,
    };
  }
}

export function saveXpState(state: UserXPState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("pw-xp-changed", { detail: state }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Records watch seconds and awards 1 XP for every 2 minutes (120 seconds)
 */
export function addWatchSeconds(secondsToAdd: number): {
  xpAdded: number;
  newTotalXp: number;
  currentCycleSeconds: number;
  leveledUp: boolean;
} {
  const current = getXpState();
  const oldLevel = calculateLevel(current.totalXp).level;

  const totalAcc = current.unclaimedSeconds + secondsToAdd;
  const xpEarned = Math.floor(totalAcc / SECONDS_PER_XP);
  const remainingSeconds = totalAcc % SECONDS_PER_XP;

  current.totalWatchSeconds += secondsToAdd;
  current.unclaimedSeconds = remainingSeconds;

  if (xpEarned > 0) {
    current.totalXp += xpEarned;
    current.todayXp += xpEarned;
  }

  saveXpState(current);

  const newLevel = calculateLevel(current.totalXp).level;
  const leveledUp = newLevel > oldLevel;

  if (xpEarned > 0) {
    window.dispatchEvent(
      new CustomEvent("pw-xp-awarded", {
        detail: {
          amount: xpEarned,
          newTotal: current.totalXp,
          leveledUp,
          newLevel,
        },
      }),
    );
  }

  return {
    xpAdded: xpEarned,
    newTotalXp: current.totalXp,
    currentCycleSeconds: remainingSeconds,
    leveledUp,
  };
}

const DEFAULT_XP_STATE: UserXPState = {
  totalXp: 0,
  totalWatchSeconds: 0,
  todayXp: 0,
  lastActiveDate: "",
  streakDays: 1,
  unclaimedSeconds: 0,
};

export function useXP() {
  const [xpState, setXpState] = useState<UserXPState>(DEFAULT_XP_STATE);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setXpState(getXpState());

    const handleUpdate = () => {
      setXpState(getXpState());
    };

    window.addEventListener("pw-xp-changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("pw-xp-changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const levelInfo = calculateLevel(xpState.totalXp);

  const addTime = useCallback((secs: number) => {
    return addWatchSeconds(secs);
  }, []);

  return {
    ...xpState,
    levelInfo,
    addTime,
    isMounted,
    secondsPerXp: SECONDS_PER_XP,
  };
}
