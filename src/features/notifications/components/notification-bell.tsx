"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  Loader2,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_POLL_INTERVAL_MS,
  type NotificationItem,
  type NotificationKind,
  type NotificationListResponse,
} from "../types";

function formatNotificationTime(iso: string): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return "";
  const diffMs = Date.now() - timestamp;
  if (diffMs >= 0 && diffMs < 60_000) return "Vừa xong";
  if (diffMs >= 60_000 && diffMs < 3_600_000) {
    return `${Math.floor(diffMs / 60_000)} phút trước`;
  }
  if (diffMs >= 3_600_000 && diffMs < 86_400_000) {
    return `${Math.floor(diffMs / 3_600_000)} giờ trước`;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(timestamp));
}

function NotificationTypeIcon({ type }: { type: NotificationKind }) {
  if (type === "NEW_LESSON") {
    return <BookOpen className="size-4 shrink-0" aria-hidden />;
  }
  if (type === "CONTEST_UPCOMING") {
    return <CalendarClock className="size-4 shrink-0" aria-hidden />;
  }
  if (type === "REPORT_RESOLVED") {
    return <CheckCircle2 className="size-4 shrink-0" aria-hidden />;
  }
  return <Trophy className="size-4 shrink-0" aria-hidden />;
}

const ICON_TONE_CLASS: Record<NotificationKind, string> = {
  NEW_LESSON: "bg-secondary text-secondary-foreground",
  CONTEST_UPCOMING: "bg-accent/15 text-accent-strong",
  SUBMISSION_RESULT: "bg-primary/10 text-primary",
  REPORT_RESOLVED: "bg-success/15 text-success",
};

export function NotificationBell() {
  const router = useRouter();
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    let disposed = false;
    let inFlight = false;
    let activeController: AbortController | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const clearPoll = () => {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const syncNotifications = () => {
      if (disposed || inFlight) return;
      inFlight = true;

      const controller = new AbortController();
      activeController = controller;

      fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (disposed || controller.signal.aborted) return;

          if (!response.ok) {
            if (response.status === 401) {
              setNotifications([]);
              setUnreadCount(0);
              setError(null);
              setIsLoading(false);
              return;
            }
            throw new Error(`HTTP_${response.status}`);
          }

          const payload = (await response.json()) as {
            data?: NotificationListResponse | null;
          };
          if (disposed || controller.signal.aborted) return;

          if (payload.data) {
            setNotifications(payload.data.notifications);
            setUnreadCount(payload.data.unreadCount);
            setError(null);
          }
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          if (
            disposed ||
            controller.signal.aborted ||
            (err instanceof DOMException && err.name === "AbortError")
          ) {
            return;
          }
          setError("Không thể tải thông báo. Vui lòng thử lại.");
          setIsLoading(false);
        })
        .finally(() => {
          if (activeController === controller) {
            activeController = null;
          }
          inFlight = false;
        });
    };

    refreshRef.current = syncNotifications;

    const startPoll = () => {
      clearPoll();
      if (document.visibilityState !== "visible") return;
      pollTimer = setInterval(() => {
        if (document.visibilityState === "visible") {
          syncNotifications();
        }
      }, NOTIFICATION_POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNotifications();
        startPoll();
      } else {
        clearPoll();
      }
    };

    syncNotifications();
    startPoll();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      disposed = true;
      refreshRef.current = null;
      clearPoll();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      activeController?.abort();
      activeController = null;
      inFlight = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (
        containerRef.current &&
        target instanceof Node &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      if (notifications.length === 0) {
        setIsLoading(true);
      }
      refreshRef.current?.();
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (markingId === item.id) return;

    if (item.readAt === null) {
      setMarkingId(item.id);
      const readAtIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: readAtIso } : entry,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        const response = await fetch(
          `/api/notifications/${encodeURIComponent(item.id)}/read`,
          {
            method: "PATCH",
            keepalive: true,
          },
        );
        if (!response.ok) {
          refreshRef.current?.();
        }
      } catch {
        refreshRef.current?.();
      } finally {
        if (mountedRef.current) {
          setMarkingId(null);
        }
      }
    }

    if (item.href) {
      setIsOpen(false);
      router.push(item.href);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    const readAtIso = new Date().toISOString();
    const previousNotifications = notifications;
    const previousUnread = unreadCount;

    setNotifications((prev) =>
      prev.map((entry) =>
        entry.readAt === null ? { ...entry, readAt: readAtIso } : entry,
      ),
    );
    setUnreadCount(0);

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!response.ok) {
        if (mountedRef.current) {
          setNotifications(previousNotifications);
          setUnreadCount(previousUnread);
          setError("Chưa thể đánh dấu tất cả đã đọc.");
        }
      }
    } catch {
      if (mountedRef.current) {
        setNotifications(previousNotifications);
        setUnreadCount(previousUnread);
        setError("Chưa thể đánh dấu tất cả đã đọc.");
      }
    } finally {
      if (mountedRef.current) {
        setIsMarkingAll(false);
      }
    }
  };

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : "Thông báo"
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={panelId}
        className="relative grid size-10 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-muted hover:text-primary focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Bell className="size-5" aria-hidden />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-accent-strong px-1 py-0.5 text-[10px] leading-none font-bold text-accent-foreground ring-2 ring-background"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Thông báo"
          className="fixed inset-x-3 top-16 z-50 mt-1 overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">Thông báo</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || isMarkingAll}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" aria-hidden />
              Đánh dấu tất cả đã đọc
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Đang tải thông báo...
              </div>
            ) : error && notifications.length === 0 ? (
              <div className="space-y-3 px-4 py-8 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    refreshRef.current?.();
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Thử lại
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell
                  className="mx-auto mb-2 size-7 text-muted-foreground/60"
                  aria-hidden
                />
                <p className="text-sm font-semibold text-foreground">
                  Chưa có thông báo nào
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bài học mới, lịch thi sắp diễn ra, kết quả chấm bài và phản
                  hồi báo lỗi sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const unread = item.readAt === null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleNotificationClick(item)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                      unread
                        ? "bg-secondary/25 hover:bg-secondary/40"
                        : "bg-background hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl",
                        ICON_TONE_CLASS[item.type],
                      )}
                    >
                      <NotificationTypeIcon type={item.type} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            unread
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/85",
                          )}
                        >
                          {item.title}
                        </p>
                        {unread && (
                          <span
                            aria-label="Chưa đọc"
                            className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                          />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                      <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                        {formatNotificationTime(item.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
