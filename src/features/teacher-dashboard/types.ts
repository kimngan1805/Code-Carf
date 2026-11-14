export interface TeacherPathSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  roomCount: number;
  exerciseCount: number;
  enrolledCount: number;
  activeLearners: number;
  completedCount: number;
  /** Completion percentage across enrolled learners (0-100). */
  completionRate: number;
  /** Average exercise pass percentage in this path (0-100). */
  passRate: number;
  bottleneckRoomCount: number;
}

export type RoomAlertSeverity = "critical" | "warning";

export interface TeacherRoomAlert {
  id: string;
  pathId: string;
  pathTitle: string;
  roomTitle: string;
  position: number;
  learnersAttempted: number;
  stuckLearners: number;
  passRate: number;
  avgAttempts: number;
  severity: RoomAlertSeverity;
  topFailingExercise: string;
}

export interface TeacherDashboardData {
  paths: TeacherPathSummary[];
  roomAlerts: TeacherRoomAlert[];
  lastUpdatedLabel: string;
}

export interface TeacherDashboardKpis {
  totalLearners: number;
  activeLearners: number;
  completedLearners: number;
  avgCompletionRate: number;
  avgPassRate: number;
  bottleneckCount: number;
  criticalBottleneckCount: number;
}

export interface TeacherOverviewView {
  kpis: TeacherDashboardKpis;
  chartPaths: TeacherPathSummary[];
  paths: TeacherPathSummary[];
  roomAlerts: TeacherRoomAlert[];
}
