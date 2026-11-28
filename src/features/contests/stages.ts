/** Định nghĩa một chặng của cuộc thi theo hành trình (bảng ContestStage). */
export type StageDefinition = {
  id: string;
  /** Số chặng hiển thị cho thí sinh, vd. 4 = "Chặng 4". */
  number: number;
  name: string;
  exerciseCount: number;
  durationMinutes: number;
};

/** Mốc thời gian của thí sinh ở một chặng (bảng ContestStageAttempt). */
export type StageAttempt = {
  stageId: string;
  startedAt: Date;
  deadlineAt: Date;
};

export type ContestStage = StageDefinition & {
  /** Vị trí đề (theo thứ tự) thuộc chặng: [start, end). */
  start: number;
  end: number;
  attempt: StageAttempt | null;
  /** Đã nộp đủ bài của chặng, hoặc đã hết giờ chặng. */
  done: boolean;
};

/**
 * Đề của cuộc thi xếp lần lượt theo các chặng (theo `number`), mỗi chặng gồm `exerciseCount`
 * bài. Một chặng xong khi đã nộp đủ bài hoặc đã hết giờ chặng; chặng hiện tại là chặng đầu
 * tiên chưa xong. `current` là null với cuộc thi thường hoặc khi mọi chặng đã xong.
 */
export function resolveContestStages(
  stages: StageDefinition[],
  submittedInOrder: boolean[],
  attempts: StageAttempt[],
  now: number,
) {
  let start = 0;
  const resolved: ContestStage[] = [...stages]
    .sort((a, b) => a.number - b.number)
    .map((stage) => {
      const end = Math.min(
        start + stage.exerciseCount,
        submittedInOrder.length,
      );
      const attempt =
        attempts.find((item) => item.stageId === stage.id) ?? null;
      const done =
        submittedInOrder.slice(start, end).every(Boolean) ||
        (!!attempt && +attempt.deadlineAt <= now);
      const result = { ...stage, start, end, attempt, done };
      start = end;
      return result;
    });
  return {
    stages: resolved,
    current: resolved.find((stage) => !stage.done) ?? null,
  };
}

/** Hạn chót khi thí sinh vào chặng: đủ thời lượng chặng nhưng không quá hạn cả lượt thi. */
export function stageDeadline(
  startedAt: Date,
  durationMinutes: number,
  attemptDeadline: Date,
) {
  return new Date(
    Math.min(+startedAt + durationMinutes * 60000, +attemptDeadline),
  );
}
