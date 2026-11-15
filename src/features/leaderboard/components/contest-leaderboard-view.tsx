"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Crown,
  Medal,
  RefreshCw,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ContestLeaderboardData } from "@/features/leaderboard/contest-leaderboard";
import type { RankedContestEntry } from "@/features/leaderboard/contest-ranking";
import { cn } from "@/lib/utils";
import {
  useContestLeaderboard,
  type ContestLeaderboardConnectionStatus,
} from "./use-contest-leaderboard";

function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatUpdatedTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getPodiumSurface(slotIndex: number): {
  card: string;
  avatar: string;
  badge: string;
} {
  if (slotIndex === 0) {
    return {
      card: "border-accent/25 bg-accent/10 shadow-xs",
      avatar: "bg-accent/15 text-accent-strong ring-2 ring-background",
      badge: "bg-background/95 text-accent-strong border-accent/20 shadow-xs",
    };
  }
  if (slotIndex === 1) {
    return {
      card: "border-secondary/60 bg-secondary/20",
      avatar: "bg-secondary/65 text-primary ring-2 ring-background",
      badge: "bg-background/95 text-primary border-secondary/70 shadow-xs",
    };
  }
  return {
    card: "border-border/80 bg-muted/45",
    avatar: "bg-background text-muted-foreground ring-1 ring-border",
    badge: "bg-background text-muted-foreground border-border/80 shadow-xs",
  };
}

export function ContestLeaderboardStatusBadge({
  status,
  className,
}: {
  status: ContestLeaderboardConnectionStatus;
  className?: string;
}) {
  if (status === "realtime") {
    return (
      <span
        data-status="realtime"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/15 px-3 py-1 text-xs font-medium text-success",
          className,
        )}
      >
        <Wifi className="size-3.5" aria-hidden="true" />
        <span>Realtime</span>
      </span>
    );
  }

  if (status === "polling") {
    return (
      <span
        data-status="polling"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/15 px-3 py-1 text-xs font-medium text-warning",
          className,
        )}
      >
        <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
        <span>Polling</span>
      </span>
    );
  }

  return (
    <span
      data-status="disconnected"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/15 px-3 py-1 text-xs font-medium text-destructive",
        className,
      )}
    >
      <WifiOff className="size-3.5" aria-hidden="true" />
      <span>Disconnected</span>
    </span>
  );
}

function PodiumCard({
  entry,
  slotIndex,
}: {
  entry: RankedContestEntry;
  slotIndex: number;
}) {
  const surface = getPodiumSurface(slotIndex);

  return (
    <article
      className={cn(
        "relative flex flex-col justify-between gap-4 rounded-2xl border p-5 transition-colors",
        surface.card,
        slotIndex === 0 && "sm:py-6",
        entry.isCurrentUser && "ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums",
            surface.badge,
          )}
        >
          {entry.rank === 1 ? (
            <Crown className="size-3.5" aria-hidden="true" />
          ) : (
            <Medal className="size-3.5" aria-hidden="true" />
          )}
          #{entry.rank}
        </span>
        {entry.isCurrentUser && (
          <span className="rounded-full bg-background/95 px-2.5 py-0.5 text-[11px] font-semibold text-primary shadow-xs">
            Bạn
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            surface.avatar,
          )}
          aria-hidden="true"
        >
          {getAvatarInitials(entry.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{entry.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {entry.finished ? "Đã nộp bài" : "Đang thi"}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between border-t border-border/50 pt-3">
        <div>
          <p className="text-xs text-muted-foreground">Điểm số</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {entry.score}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Phút phạt</p>
          <p className="text-sm font-semibold tabular-nums text-muted-foreground">
            {entry.penaltyMinutes} phút
          </p>
        </div>
      </div>
    </article>
  );
}

export interface ContestLeaderboardContentProps {
  data: ContestLeaderboardData;
  status: ContestLeaderboardConnectionStatus;
  error?: string | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  readOnly?: boolean;
  backHref?: string;
  compact?: boolean;
  heroVariant?: "full" | "compact";
}

export function ContestLeaderboardContent({
  data,
  status,
  error = null,
  isRefreshing = false,
  onRefresh,
  readOnly = false,
  backHref,
  compact = false,
  heroVariant = "full",
}: ContestLeaderboardContentProps) {
  const topThree = data.entries.slice(0, 3);
  const desktopPodiumOrder =
    topThree.length >= 3
      ? [
          { entry: topThree[1], slotIndex: 1, orderClass: "sm:order-1" },
          { entry: topThree[0], slotIndex: 0, orderClass: "sm:order-2" },
          { entry: topThree[2], slotIndex: 2, orderClass: "sm:order-3" },
        ]
      : topThree.map((entry, idx) => ({
          entry,
          slotIndex: idx,
          orderClass: "",
        }));

  const leaderScore = data.entries[0]?.score ?? 0;
  const referenceMaxScore = Math.max(
    100,
    data.contest.exerciseCount * 100,
    leaderScore,
    data.myStanding?.score ?? 0,
  );
  const myProgressPercent = data.myStanding
    ? Math.min(
        100,
        Math.round((data.myStanding.score / referenceMaxScore) * 100),
      )
    : 0;

  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {heroVariant === "compact" ? (
        <section
          aria-label="Trạng thái bảng xếp hạng"
          className="rounded-2xl border border-border/70 bg-background px-4 py-3.5 sm:px-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary/45 text-primary"
                aria-hidden="true"
              >
                <Trophy className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Bảng xếp hạng trực tiếp
                </h2>
                <p className="text-xs text-muted-foreground">
                  {data.totalParticipants} thí sinh · Phạt{" "}
                  {data.contest.penaltyMinutes} phút/lần nộp sai · Cập nhật lúc{" "}
                  {formatUpdatedTime(data.updatedAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ContestLeaderboardStatusBadge status={status} />
              {onRefresh && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  aria-label="Làm mới bảng xếp hạng"
                >
                  <RefreshCw
                    className={cn("size-3.5", isRefreshing && "animate-spin")}
                    aria-hidden="true"
                  />
                  <span>Làm mới</span>
                </Button>
              )}
            </div>
          </div>

          {error && (
            <p
              role="status"
              className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-border/70 bg-background p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              {!readOnly && backHref && (
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  <span>Về chi tiết cuộc thi</span>
                </Link>
              )}
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/45 text-primary"
                  aria-hidden="true"
                >
                  <Trophy className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <h1
                    className={cn(
                      "break-words font-bold tracking-tight text-foreground",
                      compact ? "text-lg" : "text-xl sm:text-2xl",
                    )}
                  >
                    {data.contest.title}
                  </h1>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Bảng xếp hạng cuộc thi · Phạt {data.contest.penaltyMinutes}{" "}
                    phút/lần nộp sai
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ContestLeaderboardStatusBadge status={status} />
              {onRefresh && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  aria-label="Làm mới bảng xếp hạng"
                >
                  <RefreshCw
                    className={cn("size-3.5", isRefreshing && "animate-spin")}
                    aria-hidden="true"
                  />
                  <span>Làm mới</span>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden="true" />
              <span>{data.totalParticipants} thí sinh tham gia</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              <span>Cập nhật lúc {formatUpdatedTime(data.updatedAt)}</span>
            </span>
          </div>

          {error && (
            <p
              role="status"
              className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </section>
      )}

      {data.myStanding && (
        <section
          aria-labelledby="my-contest-standing-heading"
          className="rounded-3xl border border-secondary/60 bg-secondary/20 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p
                id="my-contest-standing-heading"
                className="text-xs font-medium uppercase tracking-wide text-primary"
              >
                Thứ hạng của bạn
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {data.myStanding.rank !== null
                    ? `#${data.myStanding.rank}`
                    : "Chưa xếp hạng"}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {data.myStanding.name}
                </span>
                {!data.myStanding.inTop && data.myStanding.rank !== null && (
                  <span className="rounded-full bg-background/90 px-2.5 py-0.5 text-xs text-muted-foreground">
                    Ngoài Top {data.entries.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Tổng điểm</p>
                <p className="text-xl font-bold tabular-nums text-primary">
                  {data.myStanding.score}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Phút phạt</p>
                <p className="text-lg font-semibold tabular-nums text-muted-foreground">
                  {data.myStanding.penaltyMinutes} phút
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Progress
              value={myProgressPercent}
              label="Tiến độ điểm của bạn so với mốc chuẩn"
              className="h-1.5 bg-background/85"
              barClassName="bg-primary"
            />
            <p className="text-right text-[11px] tabular-nums text-muted-foreground">
              {data.myStanding.score} / {referenceMaxScore} điểm tham chiếu
            </p>
          </div>
        </section>
      )}

      {!compact && topThree.length > 0 && (
        <section aria-label="Top 3 thí sinh">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            {desktopPodiumOrder.map(({ entry, slotIndex, orderClass }) => (
              <div key={entry.userId} className={orderClass}>
                <PodiumCard entry={entry} slotIndex={slotIndex} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        aria-labelledby="contest-standings-table-heading"
        className="overflow-hidden rounded-3xl border border-border/70 bg-background"
      >
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2
            id="contest-standings-table-heading"
            className="text-sm font-semibold text-foreground sm:text-base"
          >
            Danh sách xếp hạng
          </h2>
          <span className="text-xs text-muted-foreground">
            Điểm cao nhất, cùng điểm xét ít phút phạt hơn
          </span>
        </div>

        {data.entries.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Chưa có thí sinh nào trong bảng xếp hạng.
          </div>
        ) : (
          <>
            <div className="hidden sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Hạng
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Thí sinh
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-medium"
                    >
                      Điểm
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-medium"
                    >
                      Phút phạt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.entries.map((entry) => (
                    <tr
                      key={entry.userId}
                      data-current-user={
                        entry.isCurrentUser ? "true" : undefined
                      }
                      className={cn(
                        "transition-colors hover:bg-muted/35",
                        entry.isCurrentUser &&
                          "bg-secondary/20 hover:bg-secondary/30",
                      )}
                    >
                      <td className="px-5 py-3.5 font-semibold tabular-nums text-foreground">
                        #{entry.rank}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              entry.isCurrentUser
                                ? "bg-secondary/50 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                            aria-hidden="true"
                          >
                            {getAvatarInitials(entry.name)}
                          </span>
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate font-medium text-foreground">
                              {entry.name}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="rounded-full bg-secondary/55 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                Bạn
                              </span>
                            )}
                            {entry.finished && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                Đã nộp
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums text-foreground">
                        {entry.score}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">
                        {entry.penaltyMinutes} phút
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border/60 sm:hidden">
              {data.entries.map((entry) => (
                <li
                  key={entry.userId}
                  data-current-user={entry.isCurrentUser ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3.5",
                    entry.isCurrentUser && "bg-secondary/20",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-8 shrink-0 text-sm font-bold tabular-nums text-foreground">
                      #{entry.rank}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {entry.name}
                        </span>
                        {entry.isCurrentUser && (
                          <span className="rounded-full bg-secondary/55 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Bạn
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Phạt {entry.penaltyMinutes} phút
                        {entry.finished ? " · Đã nộp" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {entry.score}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      đ
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

/**
 * In-workspace read-only drawer rendered inside `/contests/[slug]/play` so
 * learners can check live standings without triggering tab-switch or exit proctoring events.
 */
export function ContestLeaderboardPanel({
  slug,
  open,
  onClose,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, status, error, isRefreshing, refreshNow } =
    useContestLeaderboard({
      slug,
      enabled: open,
    });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bảng xếp hạng cuộc thi"
      className="fixed inset-0 z-50 flex justify-end bg-foreground/40 backdrop-blur-[1px]"
    >
      <div className="flex h-full w-full max-w-2xl flex-col bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-accent" aria-hidden="true" />
            <span className="text-sm font-semibold">
              Bảng xếp hạng trực tiếp
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Đóng bảng xếp hạng"
          >
            <X className="size-4" aria-hidden="true" />
            <span>Đóng</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {data ? (
            <ContestLeaderboardContent
              data={data}
              status={status}
              error={error}
              isRefreshing={isRefreshing}
              onRefresh={() => void refreshNow()}
              readOnly
              compact
            />
          ) : (
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-3xl bg-muted" />
              <div className="h-24 animate-pulse rounded-3xl bg-muted" />
              <div className="h-64 animate-pulse rounded-3xl bg-muted" />
              {error && (
                <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Embedded leaderboard panel rendered inside the `/contests/[slug]` Leaderboard tab.
 * Opens SSE only when mounted for an authorized participant and cleans up on tab exit.
 */
export function ContestLeaderboardTabPanel({
  slug,
  canView,
}: {
  slug: string;
  canView: boolean;
}) {
  const { data, status, error, isRefreshing, refreshNow } =
    useContestLeaderboard({
      slug,
      enabled: canView,
    });

  if (!canView) {
    return (
      <section className="rounded-3xl border border-border/70 bg-muted/35 p-8 text-center">
        <span
          className="mx-auto inline-flex size-11 items-center justify-center rounded-2xl bg-secondary/45 text-primary"
          aria-hidden="true"
        >
          <Trophy className="size-5" />
        </span>
        <h2 className="mt-3 text-base font-semibold text-foreground sm:text-lg">
          Bảng xếp hạng chỉ mở cho thí sinh đã đăng ký
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Hãy quay lại tab Tổng quan để đăng ký tham gia cuộc thi trước khi xem
          thứ hạng và điểm trực tiếp.
        </p>
      </section>
    );
  }

  if (!data) {
    if (error) {
      return (
        <section className="rounded-3xl border border-destructive/25 bg-destructive/10 p-6 text-center">
          <div className="flex justify-center">
            <ContestLeaderboardStatusBadge status={status} />
          </div>
          <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void refreshNow()}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("size-3.5", isRefreshing && "animate-spin")}
              aria-hidden="true"
            />
            <span>Thử lại</span>
          </Button>
        </section>
      );
    }

    return (
      <div
        aria-busy="true"
        aria-label="Đang tải bảng xếp hạng"
        className="space-y-4"
      >
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <div className="h-28 animate-pulse rounded-3xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          <div className="h-44 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  return (
    <ContestLeaderboardContent
      data={data}
      status={status}
      error={error}
      isRefreshing={isRefreshing}
      onRefresh={() => void refreshNow()}
      readOnly
      heroVariant="compact"
    />
  );
}
