import type { ExerciseKind, SubmissionStatus } from "@prisma/client";
import type { LevelInfo } from "@/features/progress/levels";

export interface ProfilePathProgress {
  id: string;
  slug: string;
  title: string;
  completed: number;
  total: number;
  percent: number;
  nextRoom: string | null;
}

export interface ProfileBadgeItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  awardedAt: Date;
}

export interface ProfileSubmissionItem {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  exerciseKind: ExerciseKind;
  maxPoints: number;
  contextLabel: string;
  contextHref: string | null;
  language: string | null;
  status: SubmissionStatus;
  score: number | null;
  runtimeMs: number | null;
  memoryKb: number | null;
  createdAt: Date;
}

export interface PublicStudentProfile {
  id: string;
  name: string;
  joinedAt: Date;
  level: LevelInfo;
  streak: {
    current: number;
    longest: number;
  };
  stats: {
    enrolledPaths: number;
    completedPaths: number;
    roomsDone: number;
    badgesCount: number;
  };
  paths: ProfilePathProgress[];
  badges: ProfileBadgeItem[];
}

export interface PublicProfileView {
  profile: PublicStudentProfile;
  isOwnProfile: boolean;
}

export interface OwnStudentProfile extends PublicStudentProfile {
  email: string;
  submissions: ProfileSubmissionItem[];
}
