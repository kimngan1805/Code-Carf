import { LearningGoal, SkillLevel } from "@prisma/client";

/** Path slugs from the seed; teachers can later create paths with the same slugs. */
export const RECOMMENDED_SLUGS = {
  fundamentals: "nhap-mon-lap-trinh",
  algorithms: "ctdl-giai-thuat",
  web: "phat-trien-web-co-ban",
} as const;

/** Picks the first path to enroll a new learner in, based on onboarding answers. */
export function recommendPathSlug(answers: {
  level: SkillLevel;
  goal: LearningGoal;
}): string {
  if (answers.goal === LearningGoal.WEB) return RECOMMENDED_SLUGS.web;
  if (answers.level === SkillLevel.BEGINNER)
    return RECOMMENDED_SLUGS.fundamentals;
  if (
    answers.goal === LearningGoal.ALGORITHMS ||
    answers.goal === LearningGoal.CONTESTS ||
    answers.level === SkillLevel.INTERMEDIATE
  )
    return RECOMMENDED_SLUGS.algorithms;
  return RECOMMENDED_SLUGS.fundamentals;
}
