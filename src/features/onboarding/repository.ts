import { db } from "@/lib/db";
import type { StudentOnboarding } from "./questions";

/** Saves answers and marks onboarding done, atomically. The learner picks a path themselves. */
export function saveStudentOnboarding(
  userId: string,
  answers: StudentOnboarding,
) {
  return db.$transaction(async (tx) => {
    const profile = {
      level: answers.level,
      goal: answers.goal,
      languages: answers.languages,
      dailyMinutes: answers.dailyMinutes,
    };
    await tx.learnerProfile.upsert({
      where: { userId },
      update: profile,
      create: { userId, ...profile },
    });

    await tx.user.update({
      where: { id: userId },
      data: { onboardedAt: new Date() },
    });
  });
}
