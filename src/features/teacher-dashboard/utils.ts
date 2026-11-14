import type {
  TeacherDashboardData,
  TeacherDashboardKpis,
  TeacherOverviewView,
  TeacherPathSummary,
} from "./types";

export const ALL_PATHS_FILTER = "all";

function computeKpis(
  paths: TeacherPathSummary[],
  alertsCount: number,
  criticalCount: number,
): TeacherDashboardKpis {
  if (paths.length === 0) {
    return {
      totalLearners: 0,
      activeLearners: 0,
      completedLearners: 0,
      avgCompletionRate: 0,
      avgPassRate: 0,
      bottleneckCount: alertsCount,
      criticalBottleneckCount: criticalCount,
    };
  }

  const totalLearners = paths.reduce(
    (sum, path) => sum + path.enrolledCount,
    0,
  );
  const activeLearners = paths.reduce(
    (sum, path) => sum + path.activeLearners,
    0,
  );
  const completedLearners = paths.reduce(
    (sum, path) => sum + path.completedCount,
    0,
  );

  const weightedCompletion =
    totalLearners > 0
      ? Math.round(
          paths.reduce(
            (sum, path) => sum + path.completionRate * path.enrolledCount,
            0,
          ) / totalLearners,
        )
      : Math.round(
          paths.reduce((sum, path) => sum + path.completionRate, 0) /
            paths.length,
        );

  const weightedPass =
    totalLearners > 0
      ? Math.round(
          paths.reduce(
            (sum, path) => sum + path.passRate * path.enrolledCount,
            0,
          ) / totalLearners,
        )
      : Math.round(
          paths.reduce((sum, path) => sum + path.passRate, 0) / paths.length,
        );

  return {
    totalLearners,
    activeLearners,
    completedLearners,
    avgCompletionRate: weightedCompletion,
    avgPassRate: weightedPass,
    bottleneckCount: alertsCount,
    criticalBottleneckCount: criticalCount,
  };
}

export function buildTeacherOverviewView(
  data: TeacherDashboardData,
  selectedPathId: string = ALL_PATHS_FILTER,
  searchQuery = "",
): TeacherOverviewView {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const pathScoped =
    selectedPathId === ALL_PATHS_FILTER
      ? data.paths
      : data.paths.filter((path) => path.id === selectedPathId);

  const paths = normalizedQuery
    ? pathScoped.filter(
        (path) =>
          path.title.toLowerCase().includes(normalizedQuery) ||
          path.description.toLowerCase().includes(normalizedQuery),
      )
    : pathScoped;

  const roomAlerts = data.roomAlerts
    .filter(
      (alert) =>
        selectedPathId === ALL_PATHS_FILTER || alert.pathId === selectedPathId,
    )
    .filter((alert) =>
      normalizedQuery
        ? alert.roomTitle.toLowerCase().includes(normalizedQuery) ||
          alert.pathTitle.toLowerCase().includes(normalizedQuery) ||
          alert.topFailingExercise.toLowerCase().includes(normalizedQuery)
        : true,
    )
    .slice()
    .sort((a, b) => a.passRate - b.passRate);

  const criticalBottleneckCount = roomAlerts.filter(
    (alert) => alert.passRate < 30,
  ).length;

  return {
    kpis: computeKpis(paths, roomAlerts.length, criticalBottleneckCount),
    chartPaths: pathScoped,
    paths,
    roomAlerts,
  };
}
