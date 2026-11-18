import { ProctoringEventType } from "@prisma/client";
import { APP_TIME_ZONE } from "@/features/progress/week-activity";

export const PROCTORING_EVENT_TYPES: readonly ProctoringEventType[] = [
  ProctoringEventType.TAB_SWITCH,
  ProctoringEventType.PASTE,
  ProctoringEventType.FULLSCREEN_EXIT,
  ProctoringEventType.WINDOW_BLUR,
  ProctoringEventType.FACE_MISSING,
  ProctoringEventType.FACE_MISMATCH,
  ProctoringEventType.MULTIPLE_FACES,
] as const;

export const PROCTORING_EVENT_LABELS: Record<ProctoringEventType, string> = {
  TAB_SWITCH: "Chuyển tab",
  PASTE: "Dán code",
  FULLSCREEN_EXIT: "Thoát toàn màn hình",
  WINDOW_BLUR: "Rời cửa sổ thi",
  FACE_MISSING: "Không thấy khuôn mặt",
  FACE_MISMATCH: "Khuôn mặt không khớp",
  MULTIPLE_FACES: "Phát hiện nhiều khuôn mặt",
};

export const DEFAULT_TIMELINE_PAGE_SIZE = 25;
export const MAX_TIMELINE_PAGE_SIZE = 100;

export interface TimelineCursor {
  createdAt: Date;
  id: string;
}

export interface ViolationDashboardFilters {
  flaggedOnly: boolean;
  eventType: ProctoringEventType | null;
  participantId: string | null;
  search: string;
  cursor: TimelineCursor | null;
  cursorRaw: string | null;
  limit: number;
}

export interface RawViolationDashboardSearchParams {
  flagged?: string | string[];
  type?: string | string[];
  participant?: string | string[];
  q?: string | string[];
  cursor?: string | string[];
  limit?: string | string[] | number;
}

export interface ParsedProctoringMetadata {
  pasteLength: number | null;
  clientOccurredAt: string | null;
  summary: string | null;
}

const vnDateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: APP_TIME_ZONE,
});

export function formatViolationDateTime(
  value: Date | string | null | undefined,
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return vnDateTimeFormatter.format(date);
}

function firstParam(
  value: string | string[] | number | undefined,
): string | null {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export function isValidProctoringEventType(
  value: string | null | undefined,
): value is ProctoringEventType {
  return (
    typeof value === "string" &&
    (PROCTORING_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function encodeTimelineCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}|${id}`;
}

export function decodeTimelineCursor(
  raw: string | null | undefined,
): TimelineCursor | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const sep = trimmed.indexOf("|");
  if (sep <= 0 || sep === trimmed.length - 1) return null;

  const iso = trimmed.slice(0, sep);
  const id = trimmed.slice(sep + 1).trim();
  if (!id || id.length > 200) return null;

  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return null;

  return { createdAt: new Date(timestamp), id };
}

export function parseTimelineLimit(
  raw: string | string[] | number | undefined,
): number {
  const first = firstParam(raw);
  if (!first) return DEFAULT_TIMELINE_PAGE_SIZE;
  const parsed = Number(first);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_TIMELINE_PAGE_SIZE;
  }
  return Math.min(Math.floor(parsed), MAX_TIMELINE_PAGE_SIZE);
}

export function parseViolationDashboardFilters(
  raw?: RawViolationDashboardSearchParams,
): ViolationDashboardFilters {
  const flaggedRaw = firstParam(raw?.flagged)?.trim().toLowerCase();
  const flaggedOnly = flaggedRaw === "1" || flaggedRaw === "true";

  const typeRaw = firstParam(raw?.type)?.trim();
  const eventType = isValidProctoringEventType(typeRaw) ? typeRaw : null;

  const participantRaw = firstParam(raw?.participant)?.trim() ?? "";
  const participantId =
    participantRaw.length > 0 &&
    participantRaw.length <= 200 &&
    participantRaw !== "all"
      ? participantRaw
      : null;

  const search = (firstParam(raw?.q) ?? "").trim().slice(0, 100);

  const cursorRawInput = firstParam(raw?.cursor)?.trim() ?? null;
  const cursor = decodeTimelineCursor(cursorRawInput);

  return {
    flaggedOnly,
    eventType,
    participantId,
    search,
    cursor,
    cursorRaw: cursor
      ? encodeTimelineCursor(cursor.createdAt, cursor.id)
      : null,
    limit: parseTimelineLimit(raw?.limit),
  };
}

export function buildViolationDashboardUrl(
  slug: string,
  filters: {
    flaggedOnly?: boolean;
    eventType?: ProctoringEventType | null;
    participantId?: string | null;
    search?: string;
    cursor?: string | null;
  },
): string {
  const params = new URLSearchParams();
  if (filters.flaggedOnly) {
    params.set("flagged", "1");
  }
  if (filters.eventType) {
    params.set("type", filters.eventType);
  }
  if (filters.participantId) {
    params.set("participant", filters.participantId);
  }
  const trimmedSearch = filters.search?.trim() ?? "";
  if (trimmedSearch) {
    params.set("q", trimmedSearch);
  }
  if (filters.cursor) {
    params.set("cursor", filters.cursor);
  }

  const query = params.toString();
  const basePath = `/gv/contests/${encodeURIComponent(slug)}`;
  return query ? `${basePath}?${query}` : basePath;
}

export function parseProctoringMetadata(
  metadata: unknown,
  type?: ProctoringEventType,
): ParsedProctoringMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { pasteLength: null, clientOccurredAt: null, summary: null };
  }

  const record = metadata as Record<string, unknown>;
  const rawPasteLength = record.pasteLength;
  const pasteLength =
    typeof rawPasteLength === "number" &&
    Number.isFinite(rawPasteLength) &&
    rawPasteLength >= 0
      ? Math.floor(rawPasteLength)
      : null;

  const rawOccurredAt = record.clientOccurredAt;
  const clientOccurredAt =
    typeof rawOccurredAt === "string" &&
    Number.isFinite(Date.parse(rawOccurredAt))
      ? rawOccurredAt
      : null;

  let summary: string | null = null;
  if (type === ProctoringEventType.PASTE && pasteLength !== null) {
    summary = `Độ dài đoạn dán: ${pasteLength} ký tự`;
  } else if (pasteLength !== null && !type) {
    summary = `Độ dài đoạn dán: ${pasteLength} ký tự`;
  }

  return { pasteLength, clientOccurredAt, summary };
}

export function getParticipantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function createEmptyEventCounts(): Record<ProctoringEventType, number> {
  return {
    TAB_SWITCH: 0,
    WINDOW_BLUR: 0,
    FULLSCREEN_EXIT: 0,
    PASTE: 0,
    FACE_MISSING: 0,
    FACE_MISMATCH: 0,
    MULTIPLE_FACES: 0,
  };
}

export interface SortableViolationParticipant {
  userId: string;
  name: string;
  violationCount: number;
  flaggedAt: string | null;
}

export function sortViolationParticipants<
  T extends SortableViolationParticipant,
>(participants: readonly T[]): T[] {
  return [...participants].sort((a, b) => {
    const aFlagged = a.flaggedAt !== null;
    const bFlagged = b.flaggedAt !== null;
    if (aFlagged !== bFlagged) return aFlagged ? -1 : 1;

    if (a.violationCount !== b.violationCount) {
      return b.violationCount - a.violationCount;
    }

    if (a.flaggedAt !== null && b.flaggedAt !== null) {
      const diff = Date.parse(b.flaggedAt) - Date.parse(a.flaggedAt);
      if (Number.isFinite(diff) && diff !== 0) return diff;
    }

    const byName = a.name.localeCompare(b.name, "vi");
    if (byName !== 0) return byName;

    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });
}
