import { ContestStatus, Prisma, ProctoringEventType } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  createEmptyEventCounts,
  encodeTimelineCursor,
  parseProctoringMetadata,
  parseViolationDashboardFilters,
  sortViolationParticipants,
  type ParsedProctoringMetadata,
  type RawViolationDashboardSearchParams,
} from "./dashboard-helpers";

export interface ViolationParticipantRow {
  userId: string;
  name: string;
  violationCount: number;
  flagged: boolean;
  flaggedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  eventCounts: Record<ProctoringEventType, number>;
  totalRecordedEvents: number;
}

export interface ViolationTimelineItem {
  id: string;
  userId: string;
  participantName: string;
  participantFlagged: boolean;
  type: ProctoringEventType;
  metadata: ParsedProctoringMetadata;
  createdAt: string;
}

export interface ContestViolationDashboardData {
  contest: {
    id: string;
    slug: string;
    title: string;
    status: ContestStatus;
    violationThreshold: number;
    examStartsAt: string | null;
    examEndsAt: string | null;
  };
  overview: {
    totalParticipants: number;
    flaggedParticipants: number;
    totalEvents: number;
    eventsByType: Record<ProctoringEventType, number>;
  };
  filters: {
    flaggedOnly: boolean;
    eventType: ProctoringEventType | null;
    participantId: string | null;
    search: string;
    cursor: string | null;
    limit: number;
  };
  selectedParticipant: {
    userId: string;
    name: string;
    violationCount: number;
    flagged: boolean;
    flaggedAt: string | null;
  } | null;
  participants: ViolationParticipantRow[];
  timeline: {
    items: ViolationTimelineItem[];
    totalFiltered: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

/**
 * Loads the teacher/admin proctoring violation dashboard for a single contest.
 * Enforces ownership at the service layer (`ADMIN` for any contest including
 * ownerless contests with `creatorId = null`; `TEACHER` only for own contests),
 * applies all filters in PostgreSQL, and uses keyset cursor pagination on
 * `(createdAt DESC, id DESC)` so concurrent events never cause duplicates or skips.
 */
export async function getContestViolationDashboard(
  slug: string,
  rawFilters?: RawViolationDashboardSearchParams,
): Promise<ContestViolationDashboardData> {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const filters = parseViolationDashboardFilters(rawFilters);

  const contest = await db.contest.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      creatorId: true,
      violationThreshold: true,
      examStartsAt: true,
      examEndsAt: true,
    },
  });

  if (!contest) {
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  }

  const isAdmin = user.role.name === "ADMIN";
  const isOwner = contest.creatorId !== null && contest.creatorId === user.id;
  if (!isAdmin && !isOwner) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Bạn không có quyền xem dashboard vi phạm của cuộc thi này.",
    );
  }

  const participantUserFilter: Prisma.UserWhereInput | undefined =
    filters.search || filters.eventType
      ? {
          ...(filters.search
            ? { name: { contains: filters.search, mode: "insensitive" } }
            : {}),
          ...(filters.eventType
            ? {
                proctoringEvents: {
                  some: {
                    contestId: contest.id,
                    type: filters.eventType,
                  },
                },
              }
            : {}),
        }
      : undefined;

  const participantWhere: Prisma.ContestParticipantWhereInput = {
    contestId: contest.id,
    ...(filters.flaggedOnly ? { flaggedAt: { not: null } } : {}),
    ...(participantUserFilter ? { user: participantUserFilter } : {}),
  };

  const timelineUserFilter: Prisma.UserWhereInput | undefined =
    filters.flaggedOnly || filters.search
      ? {
          ...(filters.search
            ? { name: { contains: filters.search, mode: "insensitive" } }
            : {}),
          ...(filters.flaggedOnly
            ? {
                contestEntries: {
                  some: {
                    contestId: contest.id,
                    flaggedAt: { not: null },
                  },
                },
              }
            : {}),
        }
      : undefined;

  const timelineWhere: Prisma.ProctoringEventWhereInput = {
    contestId: contest.id,
    ...(filters.participantId ? { userId: filters.participantId } : {}),
    ...(filters.eventType ? { type: filters.eventType } : {}),
    ...(timelineUserFilter ? { user: timelineUserFilter } : {}),
  };

  const paginatedTimelineWhere: Prisma.ProctoringEventWhereInput =
    filters.cursor
      ? {
          ...timelineWhere,
          AND: [
            {
              OR: [
                { createdAt: { lt: filters.cursor.createdAt } },
                {
                  createdAt: filters.cursor.createdAt,
                  id: { lt: filters.cursor.id },
                },
              ],
            },
          ],
        }
      : timelineWhere;

  const [
    totalParticipants,
    flaggedParticipants,
    totalEvents,
    overallEventGroups,
    participantRows,
    selectedParticipantRow,
    totalFilteredTimeline,
    timelineRows,
  ] = await Promise.all([
    db.contestParticipant.count({ where: { contestId: contest.id } }),
    db.contestParticipant.count({
      where: { contestId: contest.id, flaggedAt: { not: null } },
    }),
    db.proctoringEvent.count({ where: { contestId: contest.id } }),
    db.proctoringEvent.groupBy({
      by: ["type"],
      where: { contestId: contest.id },
      _count: { _all: true },
    }),
    db.contestParticipant.findMany({
      where: participantWhere,
      orderBy: [
        { violationCount: "desc" },
        { flaggedAt: "desc" },
        { userId: "asc" },
      ],
      select: {
        userId: true,
        violationCount: true,
        flaggedAt: true,
        startedAt: true,
        finishedAt: true,
        user: { select: { name: true } },
      },
    }),
    filters.participantId
      ? db.contestParticipant.findUnique({
          where: {
            contestId_userId: {
              contestId: contest.id,
              userId: filters.participantId,
            },
          },
          select: {
            userId: true,
            violationCount: true,
            flaggedAt: true,
            user: { select: { name: true } },
          },
        })
      : Promise.resolve(null),
    db.proctoringEvent.count({ where: timelineWhere }),
    db.proctoringEvent.findMany({
      where: paginatedTimelineWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: filters.limit + 1,
      select: {
        id: true,
        userId: true,
        type: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            contestEntries: {
              where: { contestId: contest.id },
              select: { flaggedAt: true },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  const participantIds = participantRows.map((row) => row.userId);
  const participantEventGroups =
    participantIds.length > 0
      ? await db.proctoringEvent.groupBy({
          by: ["userId", "type"],
          where: {
            contestId: contest.id,
            userId: { in: participantIds },
          },
          _count: { _all: true },
        })
      : [];

  const eventsByType = createEmptyEventCounts();
  for (const group of overallEventGroups) {
    eventsByType[group.type] = group._count._all;
  }

  const perUserCounts = new Map<string, Record<ProctoringEventType, number>>();
  for (const group of participantEventGroups) {
    let counts = perUserCounts.get(group.userId);
    if (!counts) {
      counts = createEmptyEventCounts();
      perUserCounts.set(group.userId, counts);
    }
    counts[group.type] = group._count._all;
  }

  const participants = sortViolationParticipants(
    participantRows.map((row) => {
      const eventCounts =
        perUserCounts.get(row.userId) ?? createEmptyEventCounts();
      const totalRecordedEvents = Object.values(eventCounts).reduce(
        (sum, count) => sum + count,
        0,
      );
      return {
        userId: row.userId,
        name: row.user.name,
        violationCount: row.violationCount,
        flagged: row.flaggedAt !== null,
        flaggedAt: row.flaggedAt ? row.flaggedAt.toISOString() : null,
        startedAt: row.startedAt ? row.startedAt.toISOString() : null,
        finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
        eventCounts,
        totalRecordedEvents,
      };
    }),
  );

  const hasMore = timelineRows.length > filters.limit;
  const pageRows = hasMore
    ? timelineRows.slice(0, filters.limit)
    : timelineRows;
  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasMore && lastRow
      ? encodeTimelineCursor(lastRow.createdAt, lastRow.id)
      : null;

  const timelineItems: ViolationTimelineItem[] = pageRows.map((row) => ({
    id: row.id,
    userId: row.userId,
    participantName: row.user.name,
    participantFlagged: row.user.contestEntries[0]?.flaggedAt != null,
    type: row.type,
    metadata: parseProctoringMetadata(row.metadata, row.type),
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    contest: {
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      status: contest.status,
      violationThreshold: contest.violationThreshold,
      examStartsAt: contest.examStartsAt
        ? contest.examStartsAt.toISOString()
        : null,
      examEndsAt: contest.examEndsAt ? contest.examEndsAt.toISOString() : null,
    },
    overview: {
      totalParticipants,
      flaggedParticipants,
      totalEvents,
      eventsByType,
    },
    filters: {
      flaggedOnly: filters.flaggedOnly,
      eventType: filters.eventType,
      participantId: filters.participantId,
      search: filters.search,
      cursor: filters.cursorRaw,
      limit: filters.limit,
    },
    selectedParticipant: selectedParticipantRow
      ? {
          userId: selectedParticipantRow.userId,
          name: selectedParticipantRow.user.name,
          violationCount: selectedParticipantRow.violationCount,
          flagged: selectedParticipantRow.flaggedAt !== null,
          flaggedAt: selectedParticipantRow.flaggedAt
            ? selectedParticipantRow.flaggedAt.toISOString()
            : null,
        }
      : null,
    participants,
    timeline: {
      items: timelineItems,
      totalFiltered: totalFilteredTimeline,
      hasMore,
      nextCursor,
    },
  };
}
