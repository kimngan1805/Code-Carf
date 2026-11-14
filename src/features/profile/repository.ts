import { RoleName } from "@prisma/client";
import { db } from "@/lib/db";

/** Strict field whitelist for public student profiles: never selects email, passwordHash, or submissions. */
export const publicStudentSelect = {
  id: true,
  name: true,
  xp: true,
  currentStreak: true,
  longestStreak: true,
  createdAt: true,
} as const;

export const OWN_SUBMISSION_HISTORY_LIMIT = 30;

export async function findPublicStudentRecord(targetUserId: string) {
  const user = await db.user.findFirst({
    where: {
      id: targetUserId,
      role: { name: RoleName.STUDENT },
    },
    select: publicStudentSelect,
  });

  if (!user) return null;

  const [enrollments, completedRooms, userBadges] = await Promise.all([
    db.enrollment.findMany({
      where: { userId: user.id, path: { published: true } },
      orderBy: [{ enrolledAt: "asc" }, { pathId: "asc" }],
      select: {
        path: {
          select: {
            id: true,
            slug: true,
            title: true,
            rooms: {
              orderBy: { position: "asc" },
              select: { id: true, title: true },
            },
          },
        },
      },
    }),
    db.roomProgress.findMany({
      where: { userId: user.id },
      select: { roomId: true },
    }),
    db.userBadge.findMany({
      where: { userId: user.id },
      orderBy: [{ awardedAt: "desc" }, { badgeId: "asc" }],
      select: {
        awardedAt: true,
        badge: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
          },
        },
      },
    }),
  ]);

  return {
    user,
    enrollments,
    completedRoomIds: completedRooms.map((row) => row.roomId),
    userBadges,
  };
}

export async function findOwnPrivateProfileExtras(userId: string) {
  const [account, submissions] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }),
    db.submission.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: OWN_SUBMISSION_HISTORY_LIMIT,
      select: {
        id: true,
        exerciseId: true,
        language: true,
        status: true,
        score: true,
        runtimeMs: true,
        memoryKb: true,
        createdAt: true,
        exercise: {
          select: {
            title: true,
            kind: true,
            points: true,
            room: {
              select: {
                title: true,
                path: {
                  select: {
                    slug: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        contest: {
          select: {
            slug: true,
            title: true,
          },
        },
      },
    }),
  ]);

  if (!account) return null;

  return {
    email: account.email,
    submissions,
  };
}

export type PublicStudentRecord = NonNullable<
  Awaited<ReturnType<typeof findPublicStudentRecord>>
>;
export type OwnPrivateProfileExtras = NonNullable<
  Awaited<ReturnType<typeof findOwnPrivateProfileExtras>>
>;
