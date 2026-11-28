import { ContestStatus, ExerciseKind, type PrismaClient } from "@prisma/client";
import { sampleContestSeeds } from "../src/features/contest-showcase/catalog";
import {
  TREASURE_ISLAND_EXERCISES,
  TREASURE_ISLAND_SLUG,
  TREASURE_ISLAND_STAGES,
  type StageExercise,
} from "./seed-treasure-island";

/**
 * Tạo các cuộc thi đang trưng bày ở `/thi-dau` thành cuộc thi thật (PUBLISHED) để học viên
 * đăng nhập là đăng ký được. Mỗi lần seed làm mới lịch theo giờ hiện tại, giữ nguyên
 * lượt đăng ký và bài nộp đã có. Đề thi dùng lại các bài code của Sample Contest, riêng
 * "Đảo Kho Báu C++" có đề riêng cho chặng 4, 5, 6.
 */
export async function seedShowcaseContests(
  prisma: PrismaClient,
  creatorId: string,
  exerciseIds: string[],
  studentId: string,
) {
  for (const seed of sampleContestSeeds()) {
    const { slug, ...data } = seed;
    const contest = await prisma.contest.upsert({
      where: { slug },
      update: { ...data, status: ContestStatus.PUBLISHED },
      create: { ...data, slug, status: ContestStatus.PUBLISHED, creatorId },
    });
    if (slug === TREASURE_ISLAND_SLUG) {
      await seedTreasureIsland(prisma, contest.id, exerciseIds, studentId);
      continue;
    }
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

function exerciseData(exercise: StageExercise) {
  return {
    title: exercise.title,
    prompt: exercise.prompt,
    difficulty: exercise.difficulty,
    kind: ExerciseKind.CODE,
    rubric: null,
  };
}

/**
 * Đề chặng 4, 5, 6 theo thứ tự vị trí; seed lại thì cập nhật đề tại chỗ. Bài dùng chung của
 * Sample Contest gắn từ lần seed trước được gỡ khỏi cuộc thi này (bài gốc vẫn giữ).
 * Mỗi chặng có thời gian làm riêng. Học viên mẫu được đăng ký sẵn vì lịch đăng ký đã đóng.
 */
async function seedTreasureIsland(
  prisma: PrismaClient,
  contestId: string,
  sharedExerciseIds: string[],
  studentId: string,
) {
  const shared = new Set(sharedExerciseIds);
  const existing = await prisma.contestExercise.findMany({
    where: { contestId },
    select: { position: true, exerciseId: true },
  });
  for (const row of existing) {
    if (
      shared.has(row.exerciseId) ||
      row.position > TREASURE_ISLAND_EXERCISES.length
    )
      await prisma.contestExercise.delete({
        where: {
          contestId_exerciseId: { contestId, exerciseId: row.exerciseId },
        },
      });
  }
  for (const [index, exercise] of TREASURE_ISLAND_EXERCISES.entries()) {
    const position = index + 1;
    const current = existing.find(
      (row) => row.position === position && !shared.has(row.exerciseId),
    );
    if (current) {
      await prisma.exercise.update({
        where: { id: current.exerciseId },
        data: {
          ...exerciseData(exercise),
          testCases: { deleteMany: {}, create: exercise.testCases },
        },
      });
      continue;
    }
    await prisma.contestExercise.create({
      data: {
        position,
        contest: { connect: { id: contestId } },
        exercise: {
          create: {
            ...exerciseData(exercise),
            testCases: { create: exercise.testCases },
          },
        },
      },
    });
  }
  // Chặng và thời gian làm từng chặng (độc lập với lịch mở cuộc thi).
  for (const stage of TREASURE_ISLAND_STAGES) {
    const data = {
      name: stage.name,
      exerciseCount: stage.exercises.length,
      durationMinutes: stage.durationMinutes,
    };
    await prisma.contestStage.upsert({
      where: { contestId_number: { contestId, number: stage.number } },
      update: data,
      create: { contestId, number: stage.number, ...data },
    });
  }
  await prisma.contestStage.deleteMany({
    where: {
      contestId,
      number: { notIn: TREASURE_ISLAND_STAGES.map((stage) => stage.number) },
    },
  });
  await prisma.contestParticipant.upsert({
    where: { contestId_userId: { contestId, userId: studentId } },
    update: {},
    create: { contestId, userId: studentId, joinedAt: new Date() },
  });
}
