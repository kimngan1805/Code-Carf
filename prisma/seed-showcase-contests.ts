import { ContestStatus, type PrismaClient } from "@prisma/client";
import { sampleContestSeeds } from "../src/features/contest-showcase/catalog";

/**
 * Tạo các cuộc thi đang trưng bày ở `/thi-dau` thành cuộc thi thật (PUBLISHED) để học viên
 * đăng nhập là đăng ký được. Mỗi lần seed làm mới lịch theo giờ hiện tại, giữ nguyên
 * lượt đăng ký và bài nộp đã có. Đề thi dùng lại các bài code của Sample Contest.
 */
export async function seedShowcaseContests(
  prisma: PrismaClient,
  creatorId: string,
  exerciseIds: string[],
) {
  for (const seed of sampleContestSeeds()) {
    const { slug, ...data } = seed;
    const contest = await prisma.contest.upsert({
      where: { slug },
      update: { ...data, status: ContestStatus.PUBLISHED },
      create: { ...data, slug, status: ContestStatus.PUBLISHED, creatorId },
    });
    for (const [index, exerciseId] of exerciseIds.entries()) {
      await prisma.contestExercise.upsert({
        where: {
          contestId_position: { contestId: contest.id, position: index + 1 },
        },
        update: {},
        create: { contestId: contest.id, exerciseId, position: index + 1 },
      });
    }
  }
  console.log(
    "Showcase contests are now real: sign in as a student and register from /contests.",
  );
}
