import {
  AchievementStrip,
  ContestSchedule,
  DashboardTitle,
  JourneyCard,
  LearningProgress,
  SuggestedPaths,
  TopLearners,
  WeekPlan,
} from "@/features/dashboard/components/dashboard-sections";
import { redirect } from "next/navigation";
import { RoleName } from "@prisma/client";
import { getDashboard } from "@/features/dashboard/service";
import { AppError } from "@/lib/errors";
import { getCurrentUser } from "@/features/auth/service";
import { isTeacherRole } from "@/features/auth/permissions";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (user && isTeacherRole(user.role.name)) redirect("/gv");
  if (user?.role.name === RoleName.GUEST)
    redirect("/onboarding/teacher/submitted");
  // Layout and page render in parallel, so the page also handles a missing account.
  const dashboard = await getDashboard().catch((error) => {
    if (error instanceof AppError && [401, 403].includes(error.status))
      redirect("/login");
    throw error;
  });
  return (
    <div className="space-y-6">
      <DashboardTitle paths={dashboard.paths} />

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <LearningProgress
            paths={dashboard.paths}
            recommended={dashboard.suggestedPaths.find(
              (path) => path.recommended,
            )}
          />
          <SuggestedPaths paths={dashboard.suggestedPaths} />
        </div>

        <div className="space-y-6">
          <WeekPlan streak={dashboard.streak} />
          <ContestSchedule contests={dashboard.contests} />
          <AchievementStrip
            badges={dashboard.badges}
            lockedBadges={dashboard.lockedBadges}
            stats={dashboard.stats}
          />
        </div>

        <div className="grid gap-6 self-start md:grid-cols-2 lg:col-span-2 2xl:col-span-1 2xl:grid-cols-1">
          <JourneyCard
            level={dashboard.level}
            rank={dashboard.rank}
            streak={dashboard.streak}
          />
          <TopLearners
            learners={dashboard.topLearners}
            rank={dashboard.rank}
            me={dashboard.me}
          />
        </div>
      </div>
    </div>
  );
}
