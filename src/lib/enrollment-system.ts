import { useEffect, useState, useCallback, useMemo } from "react";
import type { Batch } from "./api";

export interface EnrolledBatch {
  _id: string;
  name: string;
  class?: string | undefined;
  byName?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  language?: string | undefined;
  previewImage?: string | undefined;
  feeTotal?: number | undefined;
  type?: string | undefined;
  status?: string | undefined;
  enrolledAt: string; // ISO date string
}

const STORAGE_KEY = "pw_study_enrolled_batches_v1";

export function getEnrolledBatches(): EnrolledBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error("Failed to parse enrolled batches:", err);
    return [];
  }
}

export function saveEnrolledBatches(batches: EnrolledBatch[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
    window.dispatchEvent(new CustomEvent("pw-enrollment-changed", { detail: { batches } }));
  } catch (err) {
    console.error("Failed to save enrolled batches:", err);
  }
}

export function isBatchEnrolled(batchId: string): boolean {
  if (!batchId) return false;
  const list = getEnrolledBatches();
  return list.some((b) => b._id === batchId);
}

export function enrollBatch(batch: Batch | EnrolledBatch): boolean {
  if (!batch?._id) return false;
  const list = getEnrolledBatches();
  const existingIndex = list.findIndex((b) => b._id === batch._id);
  if (existingIndex >= 0) return false; // Already enrolled

  const newEntry: EnrolledBatch = {
    _id: batch._id,
    name: batch.name,
    class: batch.class,
    byName: batch.byName,
    startDate: batch.startDate,
    endDate: batch.endDate,
    language: batch.language,
    previewImage: batch.previewImage,
    feeTotal: batch.feeTotal,
    type: batch.type,
    status: batch.status,
    enrolledAt: new Date().toISOString(),
  };

  const updated = [newEntry, ...list];
  saveEnrolledBatches(updated);

  window.dispatchEvent(
    new CustomEvent("pw-enrollment-toast", {
      detail: {
        action: "enrolled",
        batchName: batch.name,
      },
    }),
  );

  return true;
}

export function unenrollBatch(batchId: string): boolean {
  if (!batchId) return false;
  const list = getEnrolledBatches();
  const target = list.find((b) => b._id === batchId);
  if (!target) return false;

  const updated = list.filter((b) => b._id !== batchId);
  saveEnrolledBatches(updated);

  window.dispatchEvent(
    new CustomEvent("pw-enrollment-toast", {
      detail: {
        action: "unenrolled",
        batchName: target.name,
      },
    }),
  );

  return true;
}

export function toggleBatchEnrollment(batch: Batch | EnrolledBatch): boolean {
  if (!batch?._id) return false;
  if (isBatchEnrolled(batch._id)) {
    unenrollBatch(batch._id);
    return false;
  } else {
    enrollBatch(batch);
    return true;
  }
}

export function useEnrollment() {
  const [enrolledBatches, setEnrolledBatches] = useState<EnrolledBatch[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setEnrolledBatches(getEnrolledBatches());

    const handleUpdate = () => {
      setEnrolledBatches(getEnrolledBatches());
    };

    window.addEventListener("pw-enrollment-changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("pw-enrollment-changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const enrolledIdSet = useMemo(() => {
    return new Set(enrolledBatches.map((b) => b._id));
  }, [enrolledBatches]);

  const isEnrolled = useCallback(
    (batchId: string) => {
      return enrolledIdSet.has(batchId);
    },
    [enrolledIdSet],
  );

  const enroll = useCallback((batch: Batch | EnrolledBatch) => {
    return enrollBatch(batch);
  }, []);

  const unenroll = useCallback((batchId: string) => {
    return unenrollBatch(batchId);
  }, []);

  const toggle = useCallback((batch: Batch | EnrolledBatch) => {
    return toggleBatchEnrollment(batch);
  }, []);

  return {
    enrolledBatches,
    enrolledCount: enrolledBatches.length,
    enrolledIdSet,
    isEnrolled,
    enroll,
    unenroll,
    toggle,
    isMounted,
  };
}
