import { getCurrentUser } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import {
  countUnreadNotifications,
  listUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./repository";
import {
  DEFAULT_NOTIFICATION_LIMIT,
  MAX_NOTIFICATION_LIMIT,
  type NotificationItem,
  type NotificationListResponse,
} from "./types";

export {
  notifyContestSubmissionResult,
  notifyNewLessonPublished,
  sendUpcomingContestReminders,
  type ContestReminderRunResult,
  type ContestSubmissionResultNotificationInput,
  type NewLessonNotificationInput,
} from "./writer";

async function requireSignedInUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Sign in required");
  }
  return user;
}

export function parseNotificationLimit(raw?: unknown): number {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_NOTIFICATION_LIMIT;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }
  return Math.min(Math.floor(parsed), MAX_NOTIFICATION_LIMIT);
}

function serializeNotification(row: {
  id: string;
  type: NotificationItem["type"];
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getMyNotifications(
  limitInput?: unknown,
): Promise<NotificationListResponse> {
  const user = await requireSignedInUser();
  const limit = parseNotificationLimit(limitInput);

  const [rows, unreadCount] = await Promise.all([
    listUserNotifications(user.id, limit),
    countUnreadNotifications(user.id),
  ]);

  return {
    notifications: rows.map(serializeNotification),
    unreadCount,
  };
}

export async function markMyNotificationRead(notificationId: string) {
  const user = await requireSignedInUser();
  const trimmedId =
    typeof notificationId === "string" ? notificationId.trim() : "";
  if (!trimmedId || trimmedId.length > 200) {
    throw new AppError(
      400,
      "INVALID_NOTIFICATION_ID",
      "Mã thông báo không hợp lệ.",
    );
  }

  const updated = await markNotificationAsRead(user.id, trimmedId);
  return {
    id: updated.id,
    readAt: updated.readAt.toISOString(),
  };
}

export async function markAllMyNotificationsRead() {
  const user = await requireSignedInUser();
  return markAllNotificationsAsRead(user.id);
}
