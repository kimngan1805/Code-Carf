import type { SubmissionStatus } from "@prisma/client";
import { languages } from "./languages";
import type { Tone } from "./result-view";

export const HISTORY_PAGE_SIZE = 10;

/** Page number from a query string value: anything that is not a positive integer becomes 1. */
export function parsePage(raw: unknown): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isSafeInteger(value) && value >= 1 ? value : 1;
}

/** Clamps the requested page into 1..totalPages (an empty history is one empty page). */
export function paginate(requested: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, requested), totalPages);
  return { page, totalPages, skip: (page - 1) * HISTORY_PAGE_SIZE };
}

const STATUS: Record<SubmissionStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Chờ chấm", tone: "neutral" },
  RUNNING: { label: "Đang chấm", tone: "neutral" },
  NEEDS_REVIEW: { label: "Chờ duyệt", tone: "neutral" },
  ACCEPTED: { label: "Đạt", tone: "pass" },
  REJECTED: { label: "Chưa đạt", tone: "fail" },
  ERROR: { label: "Lỗi chấm", tone: "warn" },
};

export function submissionStatusView(status: SubmissionStatus) {
  return STATUS[status];
}

export function languageLabel(language: string | null) {
  return (
    languages.find((item) => item.id === language)?.label ?? language ?? "—"
  );
}

/** "70/100", or "—/100" while the submission has no score yet. */
export function formatScore(score: number | null, maxScore: number) {
  return `${score ?? "—"}/${maxScore}`;
}

const submittedAt = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function formatSubmittedAt(date: Date) {
  return submittedAt.format(date);
}
