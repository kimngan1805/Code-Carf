import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AchievementsHeader,
  AchievementsJourneySection,
  EarnedBadgesSection,
  LockedBadgesSection,
  NextBadgeGoalSection,
} from "@/features/achievements/components/achievements-sections";
import { getAchievements } from "@/features/achievements/service";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Thành tích · Code Carf",
};

export default async function AchievementsPage() {
  const achievements = await getAchievements().catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/hv/achievements");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });

  return (
    <div className="space-y-6">
      <AchievementsHeader summary={achievements.summary} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AchievementsJourneySection
            level={achievements.level}
            summary={achievements.summary}
          />
        </div>
        <div className="lg:col-span-5">
          <NextBadgeGoalSection
            nextGoal={achievements.nextGoal}
            totalCount={achievements.summary.totalCount}
          />
        </div>
      </div>

      <EarnedBadgesSection badges={achievements.earnedBadges} />
      <LockedBadgesSection
        badges={achievements.lockedBadges}
        totalCount={achievements.summary.totalCount}
        nextGoalId={achievements.nextGoal?.id}
      />
    </div>
  );
}
