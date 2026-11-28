/**
 * Bộ khung dùng chung cho các seed lộ trình đầy đủ (C++, CTDL & giải thuật):
 * bài học 12 phần + video YouTube, bài trắc nghiệm, bài code chấm test case và
 * bài tự luận. Mỗi file seed chỉ khai báo dữ liệu rồi gọi `seedPath`.
 *
 * Chạy lại nhiều lần an toàn: upsert theo slug / vị trí / id cố định; test case
 * và câu hỏi trắc nghiệm được ghi lại từ đầu mỗi lần.
 */
import { Difficulty, ExerciseKind, PrismaClient } from "@prisma/client";

export type Case = { input: string; expected: string; isHidden: boolean };
export type Question = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};
export type ExerciseSeed =
  | {
      kind: "CODE";
      key: string;
      title: string;
      difficulty: Difficulty;
      points: number;
      prompt: string;
      tests: Case[];
      timeLimitMs?: number;
    }
  | {
      kind: "QUIZ";
      key: string;
      title: string;
      points: number;
      prompt: string;
      questions: Question[];
    }
  | {
      kind: "HANDWRITTEN";
      key: string;
      title: string;
      difficulty: Difficulty;
      points: number;
      prompt: string;
      rubric: string;
    };

/** 12 phần theo đúng thứ tự khung bài học hiển thị trên trang lộ trình. */
export type Parts = {
  overview: string;
  concept: string;
  characteristics: string;
  classification: string;
  mechanism: string;
  syntax: string;
  example: string;
  application: string;
  prosCons: string;
  errors: string;
  takeaways: string;
  practice: string;
};

export type Video = { id: string; caption: string };

export type RoomSeed = {
  title: string;
  description: string;
  exercises: ExerciseSeed[];
} & (
  | { videos: Video[]; parts: Parts }
  /** Bài không theo khung 12 phần (ôn tập, mini project, tổng kết). */
  | { videos?: Video[]; content: string }
);

export type PathSeed = {
  slug: string;
  /** Tiền tố id bài tập, ví dụ `seed-cpp` → `seed-cpp-hello-world`. */
  exercisePrefix: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  estimatedMinutes: number;
  coverTheme: string;
  rooms: RoomSeed[];
  defaultTimeLimitMs?: number;
};

const youtube = (id: string) => `https://www.youtube.com/watch?v=${id}`;

function videoBlock(videos: Video[]) {
  return videos
    .map((video) => `${youtube(video.id)}\n\n_${video.caption}_`)
    .join("\n\n");
}

export function lesson(room: RoomSeed) {
  if (!("parts" in room)) {
    if (!room.videos?.length) return room.content;
    const [heading, ...rest] = room.content.split("\n\n");
    return [
      heading,
      `### Video bài giảng\n\n${videoBlock(room.videos)}`,
      ...rest,
    ].join("\n\n");
  }
  const p = room.parts;
  return [
    `# ${room.title}`,
    `## Tổng quan\n\n${p.overview}`,
    `### Video bài giảng\n\n${videoBlock(room.videos)}`,
    `## Khái niệm\n\n${p.concept}`,
    `## Đặc điểm\n\n${p.characteristics}`,
    `## Phân loại\n\n${p.classification}`,
    `## Cách thức hoạt động\n\n${p.mechanism}`,
    `## Cú pháp\n\n${p.syntax}`,
    `## Ví dụ minh họa\n\n${p.example}`,
    `## Ứng dụng thực tế\n\n${p.application}`,
    `## Ưu và nhược điểm\n\n${p.prosCons}`,
    `## Lỗi thường gặp\n\n${p.errors}`,
    `## Ghi nhớ\n\n${p.takeaways}`,
    `## Luyện tập\n\n${p.practice}`,
  ].join("\n\n");
}

/** Tạo test case từ danh sách đầu vào; `visible` test đầu hiện, còn lại ẩn. */
export function cases(
  inputs: string[],
  solve: (input: string) => string,
  visible = 2,
): Case[] {
  return inputs.map((input, index) => ({
    input,
    expected: solve(input),
    isHidden: index >= visible,
  }));
}

/** Thêm mục "Ví dụ" (lấy từ test hiện đầu tiên) vào cuối đề bài. */
export function withExample(prompt: string, tests: Case[]) {
  const sample = tests.find((test) => !test.isHidden) ?? tests[0];
  const input = sample.input
    ? `\`\`\`\n${sample.input}\n\`\`\``
    : "_(không có đầu vào)_";
  return `${prompt}\n\n### Ví dụ\n\n**Đầu vào**\n\n${input}\n\n**Đầu ra**\n\n\`\`\`\n${sample.expected}\n\`\`\``;
}

/** Bài code: đề bài tự có mục Ví dụ lấy từ test hiện đầu tiên. */
export function code(
  key: string,
  title: string,
  difficulty: Difficulty,
  prompt: string,
  tests: Case[],
  points = 100,
  timeLimitMs?: number,
): ExerciseSeed {
  return {
    kind: "CODE",
    key,
    title,
    difficulty,
    points,
    prompt: withExample(prompt, tests),
    tests,
    timeLimitMs,
  };
}

export const ints = (line: string) => line.trim().split(/\s+/).map(Number);
export const lines = (input: string) => input.trim().split("\n");

/** Sinh dãy số giả ngẫu nhiên cố định (cùng seed → cùng kết quả) cho test lớn. */
export function pseudoRandom(seed: number) {
  let state = seed >>> 0;
  return (min: number, max: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + (state % (max - min + 1));
  };
}

export async function seedPath(prisma: PrismaClient, seed: PathSeed) {
  // Mặc định dùng giáo viên của seed local; trên deploy đặt SEED_TEACHER_EMAIL
  // thành email một giáo viên (hoặc admin) có thật để lộ trình thuộc về họ.
  const teacherEmail = process.env.SEED_TEACHER_EMAIL ?? "teacher@local.test";
  const teacher = await prisma.user.findUnique({
    where: { email: teacherEmail },
    select: { id: true, role: { select: { name: true } } },
  });
  if (!teacher)
    throw new Error(
      `Chưa có tài khoản ${teacherEmail}. Hãy chạy \`npm run db:seed\` hoặc đặt SEED_TEACHER_EMAIL.`,
    );
  if (!["TEACHER", "ADMIN"].includes(teacher.role.name))
    throw new Error(`${teacherEmail} không phải giáo viên hay admin.`);

  const metadata = {
    title: seed.title,
    description: seed.description,
    difficulty: seed.difficulty,
    tags: seed.tags,
    estimatedMinutes: seed.estimatedMinutes,
    coverTheme: seed.coverTheme,
    published: true,
    deletedAt: null,
  };
  const path = await prisma.path.upsert({
    where: { slug: seed.slug },
    update: metadata,
    create: {
      slug: seed.slug,
      ...metadata,
      publishedAt: new Date(),
      sequentialUnlock: true,
      creatorId: teacher.id,
    },
  });

  const counts = { CODE: 0, QUIZ: 0, HANDWRITTEN: 0, tests: 0, questions: 0 };
  for (const [index, room] of seed.rooms.entries()) {
    const position = index + 1;
    const data = {
      title: room.title,
      description: room.description,
      content: lesson(room),
      published: true,
    };
    const saved = await prisma.room.upsert({
      where: { pathId_position: { pathId: path.id, position } },
      update: data,
      create: { pathId: path.id, position, ...data },
    });
    for (const [order, item] of room.exercises.entries()) {
      const id = `${seed.exercisePrefix}-${item.key}`;
      const fields = {
        position: order + 1,
        roomId: saved.id,
        title: item.title,
        prompt: item.prompt,
        kind: ExerciseKind[item.kind],
        difficulty: item.kind === "QUIZ" ? Difficulty.EASY : item.difficulty,
        points: item.points,
        timeLimitMs:
          (item.kind === "CODE" ? item.timeLimitMs : undefined) ??
          seed.defaultTimeLimitMs ??
          2000,
        memoryLimitKb: 256 * 1024,
        rubric: item.kind === "HANDWRITTEN" ? item.rubric : null,
      };
      await prisma.exercise.upsert({
        where: { id },
        update: fields,
        create: { id, ...fields },
      });
      await prisma.testCase.deleteMany({ where: { exerciseId: id } });
      await prisma.quizQuestion.deleteMany({ where: { exerciseId: id } });
      if (item.kind === "CODE") {
        await prisma.testCase.createMany({
          data: item.tests.map((test) => ({ ...test, exerciseId: id })),
        });
        counts.tests += item.tests.length;
      }
      if (item.kind === "QUIZ") {
        await prisma.quizQuestion.createMany({
          data: item.questions.map((question, order) => ({
            ...question,
            position: order,
            exerciseId: id,
          })),
        });
        counts.questions += item.questions.length;
      }
      counts[item.kind] += 1;
    }
  }
  // Bài học thừa (vị trí lớn hơn số bài mẫu) và chưa ai học thì gỡ đi.
  const extra = await prisma.room.findMany({
    where: { pathId: path.id, position: { gt: seed.rooms.length } },
    select: { id: true, _count: { select: { progress: true } } },
  });
  for (const room of extra)
    if (room._count.progress === 0)
      await prisma.room.delete({ where: { id: room.id } });

  console.log(
    `Đã seed lộ trình "${seed.slug}": ${seed.rooms.length} bài học, ${counts.CODE} bài code (${counts.tests} test case), ${counts.QUIZ} bài trắc nghiệm (${counts.questions} câu), ${counts.HANDWRITTEN} bài tự luận.`,
  );
}

/** Chạy `seedPath` như một script độc lập và đóng kết nối khi xong. */
export function runSeed(seed: PathSeed) {
  const prisma = new PrismaClient();
  seedPath(prisma, seed)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
