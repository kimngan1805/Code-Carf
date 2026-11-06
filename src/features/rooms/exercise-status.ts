import { SubmissionStatus } from "@prisma/client";

export type ExerciseState = "not_started" | "submitted" | "passed";

export function exerciseState(
  statuses: readonly SubmissionStatus[],
): ExerciseState {
  if (statuses.includes(SubmissionStatus.ACCEPTED)) return "passed";
  return statuses.length > 0 ? "submitted" : "not_started";
}
