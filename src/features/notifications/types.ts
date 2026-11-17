export const NOTIFICATION_TYPES = [
  "NEW_LESSON",
  "CONTEST_UPCOMING",
  "SUBMISSION_RESULT",
  "REPORT_RESOLVED",
] as const;

export type NotificationKind = (typeof NOTIFICATION_TYPES)[number];

export const DEFAULT_NOTIFICATION_LIMIT = 20;
export const MAX_NOTIFICATION_LIMIT = 50;
export const NOTIFICATION_POLL_INTERVAL_MS = 30_000;
export const UPCOMING_CONTEST_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

export interface NotificationItem {
  id: string;
  type: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  dedupeKey?: string | null;
}