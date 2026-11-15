import { requireRole } from "@/features/auth/service";
import { getAttemptDeadline } from "@/features/contests/access";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function getAttemptReview(slug: string) {
  const user = await requireRole(["STUDENT"]);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Contest" WHERE "slug" = ${slug} FOR SHARE`;
    const contest = await tx.contest.findUnique({ where: { slug } });
    if (!contest || !["PUBLISHED", "FINISHED"].includes(contest.status))
      throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
    await tx.$queryRaw`SELECT "userId" FROM "ContestParticipant" WHERE "contestId" = ${contest.id} AND "userId" = ${user.id} FOR SHARE`;
    const participant = await tx.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: contest.id, userId: user.id } },
    });
    const deadline = getAttemptDeadline(contest, participant);
    if (
      !participant?.startedAt ||
      !deadline ||
      (!participant.finishedAt && Date.now() < +deadline)
    )
      throw new AppError(
        403,
        "RESULTS_NOT_AVAILABLE",
        "Kết quả chỉ hiển thị khi lượt thi đã kết thúc.",
      );
    const groups = await tx.proctoringEvent.groupBy({
      by: ["type"],
      where: { contestId: contest.id, userId: user.id },
      _count: { _all: true },
    });
    const count = (type: string) =>
      groups.find((group) => group.type === type)?._count._all ?? 0;
    const submissions = await tx.submission.findMany({
      where: { contestId: contest.id, userId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        exerciseId: true,
        exercise: { select: { title: true } },
        language: true,
        status: true,
        score: true,
        feedback: true,
        createdAt: true,
        autoSubmitted: true,
      },
    });
    return {
      submissions: submissions.map((submission) => ({
        ...submission,
        createdAt: submission.createdAt.toISOString(),
      })),
      pasteCount: count("PASTE"),
      tabSwitchCount: count("TAB_SWITCH"),
      fullscreenExitCount: count("FULLSCREEN_EXIT"),
      threshold: contest.violationThreshold,
      flagged: !!participant.flaggedAt,
    };
  });
}
export type AttemptReview = Awaited<ReturnType<typeof getAttemptReview>>;
