"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContestStatus, ProctoringEventType } from "@prisma/client";
import {
  Activity,
  AppWindow,
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  ClipboardPaste,
  Clock3,
  Eye,
  Minimize2,
  RefreshCw,
  RotateCcw,
  ScanFace,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ContestViolationDashboardData } from "../dashboard";
import {
  buildViolationDashboardUrl,
  formatViolationDateTime,
  getParticipantInitials,
  PROCTORING_EVENT_LABELS,
  PROCTORING_EVENT_TYPES,
} from "../dashboard-helpers";
import { ThresholdForm } from "./threshold-form";

const numberFormat = new Intl.NumberFormat("vi-VN");

const CONTEST_STATUS_LABELS: Record<ContestStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đang mở",
  FINISHED: "Đã kết thúc",
};

const CORE_MONITORED_TYPES: readonly ProctoringEventType[] = [
  "TAB_SWITCH",
  "PASTE",
  "FULLSCREEN_EXIT",
];

const EVENT_ICONS: Record<ProctoringEventType, LucideIcon> = {
  TAB_SWITCH: ArrowLeftRight,
  PASTE: ClipboardPaste,
  FULLSCREEN_EXIT: Minimize2,
  WINDOW_BLUR: AppWindow,
  FACE_MISSING: ScanFace,
  FACE_MISMATCH: ScanFace,
  MULTIPLE_FACES: ScanFace,
};

function getEventBadgeTone(type: ProctoringEventType): string {
  switch (type) {
    case "PASTE":
      return "border-warning/30 bg-warning/15 text-warning";
    case "FULLSCREEN_EXIT":
      return "border-accent/30 bg-accent/15 text-accent-strong";
    case "FACE_MISSING":
    case "FACE_MISMATCH":
    case "MULTIPLE_FACES":
      return "border-destructive/30 bg-destructive/15 text-destructive";
    case "TAB_SWITCH":
    case "WINDOW_BLUR":
    default:
      return "border-primary/20 bg-secondary/45 text-primary";
  }
}

function getEventBarFillTone(type: ProctoringEventType): string {
  switch (type) {
    case "PASTE":
      return "bg-warning";
    case "FULLSCREEN_EXIT":
      return "bg-accent-strong";
    case "FACE_MISSING":
    case "FACE_MISMATCH":
    case "MULTIPLE_FACES":
      return "bg-destructive";
    case "WINDOW_BLUR":
      return "bg-highlight";
    case "TAB_SWITCH":
    default:
      return "bg-primary";
  }
}

export function ViolationDashboard({
  data,
}: {
  data: ContestViolationDashboardData;
}) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(data.filters.search);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"participants" | "timeline">(
    data.selectedParticipant ? "timeline" : "participants",
  );

  const {
    contest,
    overview,
    filters,
    selectedParticipant,
    participants,
    timeline,
  } = data;

  const hasActiveFilters =
    filters.flaggedOnly ||
    filters.eventType !== null ||
    filters.participantId !== null ||
    filters.search.length > 0;

  const flaggedSharePercent =
    overview.totalParticipants > 0
      ? Math.round(
          (overview.flaggedParticipants / overview.totalParticipants) * 100,
        )
      : 0;

  const maxEventTypeCount = Math.max(
    1,
    ...PROCTORING_EVENT_TYPES.map((type) => overview.eventsByType[type]),
  );

  function navigateWithFilters(overrides: {
    flaggedOnly?: boolean;
    eventType?: ProctoringEventType | null;
    participantId?: string | null;
    search?: string;
    cursor?: string | null;
  }) {
    const resolvedParticipant =
      overrides.participantId !== undefined
        ? overrides.participantId === null
          ? "all"
          : overrides.participantId
        : (filters.participantId ?? "all");

    const nextUrl = buildViolationDashboardUrl(contest.slug, {
      flaggedOnly: overrides.flaggedOnly ?? filters.flaggedOnly,
      eventType:
        overrides.eventType !== undefined
          ? overrides.eventType
          : filters.eventType,
      participantId: resolvedParticipant,
      search: overrides.search ?? filters.search,
      cursor: overrides.cursor !== undefined ? overrides.cursor : null,
    });
    router.push(nextUrl);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateWithFilters({ search: searchInput, cursor: null });
  }

  function handleResetFilters() {
    setSearchInput("");
    router.push(
      buildViolationDashboardUrl(contest.slug, { participantId: "all" }),
    );
  }

  function handleSelectParticipant(userId: string) {
    const isAlreadySelected = filters.participantId === userId;
    navigateWithFilters({
      participantId: isAlreadySelected ? null : userId,
      cursor: null,
    });
    if (!isAlreadySelected) {
      setMobileTab("timeline");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      {/* Compact Contest Header (~80-96px on desktop) */}
      <header className="rounded-2xl border border-border/70 bg-background px-4 py-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/gv/contests"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Quay lại
              </Link>
              <span className="text-border" aria-hidden>
                /
              </span>
              <span className="inline-flex items-center rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {CONTEST_STATUS_LABELS[contest.status]}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Giờ Việt Nam · UTC+7
              </span>
            </div>

            <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {contest.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Key inline metrics */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold tabular-nums",
                  overview.flaggedParticipants > 0
                    ? "border-warning/40 bg-warning/15 text-warning"
                    : "border-border/70 bg-muted/60 text-foreground",
                )}
              >
                {overview.flaggedParticipants > 0 ? (
                  <ShieldAlert className="size-3.5" aria-hidden />
                ) : (
                  <ShieldCheck className="size-3.5 text-success" aria-hidden />
                )}
                <span>
                  {numberFormat.format(overview.flaggedParticipants)} thí sinh
                  cần xem xét /{" "}
                  {numberFormat.format(overview.totalParticipants)} thí sinh
                </span>
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 font-medium tabular-nums text-muted-foreground">
                <Activity className="size-3.5 text-primary" aria-hidden />
                <span>{numberFormat.format(overview.totalEvents)} sự kiện</span>
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 font-medium tabular-nums text-muted-foreground">
                <SlidersHorizontal className="size-3.5" aria-hidden />
                <span>Ngưỡng: {contest.violationThreshold}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant={analyticsOpen ? "secondary" : "outline"}
                size="sm"
                aria-expanded={analyticsOpen}
                onClick={() => setAnalyticsOpen((prev) => !prev)}
                className="h-8 px-2.5 text-xs"
              >
                <BarChart3 className="size-3.5" aria-hidden />
                <span>Phân tích &amp; Cấu hình</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    analyticsOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.refresh()}
                className="h-8 px-2.5 text-xs"
              >
                <RefreshCw className="size-3.5" aria-hidden />
                <span>Làm mới</span>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs"
              >
                <Link href={`/contests/${contest.slug}`}>
                  <Eye className="size-3.5" aria-hidden />
                  <span>Cuộc thi</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Analytics & Threshold Settings (collapsed by default) */}
      {analyticsOpen && (
        <section
          aria-label="Phân tích và cấu hình"
          className="space-y-4 rounded-2xl border border-border/70 bg-background p-4 sm:p-5"
        >
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div
              className={cn(
                "rounded-2xl border p-4",
                overview.flaggedParticipants > 0
                  ? "border-warning/40 bg-warning/5"
                  : "border-border/60 bg-background",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs font-semibold text-muted-foreground">
                  Thí sinh bị gắn cờ
                </dt>
                {overview.flaggedParticipants > 0 ? (
                  <ShieldAlert className="size-4 text-warning" aria-hidden />
                ) : (
                  <ShieldCheck className="size-4 text-success" aria-hidden />
                )}
              </div>
              <dd
                className={cn(
                  "mt-2 text-2xl font-bold tabular-nums",
                  overview.flaggedParticipants > 0
                    ? "text-warning"
                    : "text-foreground",
                )}
              >
                {numberFormat.format(overview.flaggedParticipants)}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {overview.flaggedParticipants > 0
                  ? `${flaggedSharePercent}% trên tổng ${numberFormat.format(overview.totalParticipants)} thí sinh`
                  : "Chưa có thí sinh vượt ngưỡng"}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs font-semibold text-muted-foreground">
                  Tổng thí sinh
                </dt>
                <Users className="size-4 text-primary" aria-hidden />
              </div>
              <dd className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {numberFormat.format(overview.totalParticipants)}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {numberFormat.format(
                  Math.max(
                    0,
                    overview.totalParticipants - overview.flaggedParticipants,
                  ),
                )}{" "}
                trạng thái bình thường
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs font-semibold text-muted-foreground">
                  Tổng sự kiện vi phạm
                </dt>
                <Activity className="size-4 text-primary" aria-hidden />
              </div>
              <dd className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {numberFormat.format(overview.totalEvents)}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                Tổng hợp toàn cuộc thi
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs font-semibold text-muted-foreground">
                  Ngưỡng cảnh báo
                </dt>
                <SlidersHorizontal
                  className="size-4 text-accent-strong"
                  aria-hidden
                />
              </div>
              <dd className="mt-2 text-2xl font-bold tabular-nums text-primary">
                {numberFormat.format(contest.violationThreshold)}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                Gắn cờ từ lần thứ{" "}
                {numberFormat.format(contest.violationThreshold + 1)}
              </p>
            </div>
          </dl>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-2.5 rounded-2xl border border-border/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  Phân bổ theo 7 loại sự kiện (toàn cuộc thi)
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {numberFormat.format(overview.totalEvents)} sự kiện
                </span>
              </div>

              {overview.totalEvents === 0 && (
                <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Chưa ghi nhận sự kiện nào. Nhấn vào thanh khi có dữ liệu để
                  lọc nhanh.
                </p>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {PROCTORING_EVENT_TYPES.map((type) => {
                  const count = overview.eventsByType[type];
                  const sharePercent =
                    overview.totalEvents > 0
                      ? Math.round((count / overview.totalEvents) * 100)
                      : 0;
                  const barWidthPercent =
                    overview.totalEvents > 0
                      ? Math.round((count / maxEventTypeCount) * 100)
                      : 0;
                  const active = filters.eventType === type;
                  const Icon = EVENT_ICONS[type];

                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        navigateWithFilters({
                          eventType: active ? null : type,
                          cursor: null,
                        })
                      }
                      className={cn(
                        "block w-full rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                        active
                          ? "border-primary bg-secondary/25 ring-2 ring-highlight/25"
                          : "border-border/60 bg-background hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                          <Icon
                            className="size-3.5 text-muted-foreground"
                            aria-hidden
                          />
                          <span>{PROCTORING_EVENT_LABELS[type]}</span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          <strong className="text-foreground">
                            {numberFormat.format(count)}
                          </strong>{" "}
                          ({sharePercent}%)
                        </span>
                      </div>
                      <div
                        aria-hidden
                        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width]",
                            getEventBarFillTone(type),
                          )}
                          style={{
                            width: `${count > 0 ? Math.max(4, barWidthPercent) : 0}%`,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <h2 className="mb-3 text-sm font-bold text-foreground">
                Điều chỉnh ngưỡng gắn cờ
              </h2>
              <ThresholdForm
                slug={contest.slug}
                threshold={contest.violationThreshold}
              />
            </div>
          </div>
        </section>
      )}

      {/* Mobile/Tablet View Switcher (hidden on lg+ desktop) */}
      <div
        role="tablist"
        aria-label="Chuyển khu vực giám sát"
        className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 lg:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "participants"}
          onClick={() => setMobileTab("participants")}
          className={cn(
            "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
            mobileTab === "participants"
              ? "bg-background text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Thí sinh ({numberFormat.format(participants.length)})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "timeline"}
          onClick={() => setMobileTab("timeline")}
          className={cn(
            "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
            mobileTab === "timeline"
              ? "bg-background text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Nhật ký sự kiện ({numberFormat.format(timeline.totalFiltered)})
        </button>
      </div>

      {/* Investigation Workspace: 35% Left / 65% Right with independent viewport scrolling on desktop */}
      <div className="grid gap-4 lg:h-[calc(100dvh-12.5rem)] lg:min-h-[460px] lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)]">
        {/* Panel trái – Participant Monitoring (35%) */}
        <section
          aria-labelledby="participants-heading"
          className={cn(
            "min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background lg:flex lg:h-full",
            mobileTab === "participants" ? "flex" : "hidden lg:flex",
          )}
        >
          {/* Fixed Panel Header */}
          <div className="shrink-0 space-y-2.5 border-b border-border/60 bg-background p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2
                id="participants-heading"
                className="text-sm font-bold text-foreground"
              >
                Giám sát thí sinh
              </h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {numberFormat.format(participants.length)} /{" "}
                {numberFormat.format(overview.totalParticipants)}
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              {/* Toggle Tất cả / Cần xem xét */}
              <div
                role="group"
                aria-label="Lọc trạng thái cần xem xét"
                className="grid grid-cols-2 rounded-xl bg-muted p-1"
              >
                <button
                  type="button"
                  aria-pressed={!filters.flaggedOnly}
                  onClick={() =>
                    navigateWithFilters({ flaggedOnly: false, cursor: null })
                  }
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    !filters.flaggedOnly
                      ? "bg-background text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  aria-pressed={filters.flaggedOnly}
                  onClick={() =>
                    navigateWithFilters({ flaggedOnly: true, cursor: null })
                  }
                  className={cn(
                    "inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    filters.flaggedOnly
                      ? "bg-background text-warning shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ShieldAlert className="size-3.5" aria-hidden />
                  <span>Cần xem xét</span>
                </button>
              </div>

              {/* Search by name */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-1.5"
              >
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Tìm kiếm thí sinh theo tên</span>
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Tìm tên thí sinh..."
                    className="h-9 rounded-xl pl-8 text-xs"
                  />
                </label>
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                >
                  Tìm
                </Button>
              </form>
            </div>
          </div>

          {/* Independently Scrollable Compact Participant List */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {overview.totalParticipants === 0 ? (
              <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-xl bg-muted/35 px-4 py-8 text-center">
                <Users
                  className="mb-2 size-6 text-muted-foreground/60"
                  aria-hidden
                />
                <p className="text-sm font-semibold text-foreground">
                  Chưa có thí sinh tham gia
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Thí sinh đăng ký cuộc thi sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : participants.length === 0 ? (
              <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-xl bg-muted/35 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Không có thí sinh khớp bộ lọc
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Thử bỏ lọc Cần xem xét hoặc đổi từ khóa tìm kiếm.
                </p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleResetFilters}
                  >
                    Đặt lại bộ lọc
                  </Button>
                )}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {participants.map((participant) => {
                  const isSelected =
                    filters.participantId === participant.userId;
                  const extraTypes = PROCTORING_EVENT_TYPES.filter(
                    (type) =>
                      !CORE_MONITORED_TYPES.includes(type) &&
                      participant.eventCounts[type] > 0,
                  );
                  const nonZeroTypes = [
                    ...CORE_MONITORED_TYPES,
                    ...extraTypes,
                  ].filter((type) => participant.eventCounts[type] > 0);

                  return (
                    <li key={participant.userId}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          handleSelectParticipant(participant.userId)
                        }
                        className={cn(
                          "w-full rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                          isSelected
                            ? "border-primary bg-secondary/35 ring-1 ring-primary/30"
                            : participant.flagged
                              ? "border-warning/35 bg-warning/5 hover:bg-warning/10"
                              : "border-transparent bg-background hover:border-border/70 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            aria-hidden
                            className={cn(
                              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold select-none",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : participant.flagged
                                  ? "bg-warning/15 text-warning ring-1 ring-warning/35"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {getParticipantInitials(participant.name)}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-foreground">
                                {participant.name}
                              </span>
                              <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">
                                {participant.violationCount}
                                <span className="font-normal text-muted-foreground">
                                  /{contest.violationThreshold}
                                </span>
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                  participant.flagged
                                    ? "border-warning/30 bg-warning/15 text-warning"
                                    : "border-border/60 bg-muted/70 text-muted-foreground",
                                )}
                              >
                                {participant.flagged ? (
                                  <>
                                    <ShieldAlert
                                      className="size-2.5"
                                      aria-hidden
                                    />
                                    Cần xem xét
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck
                                      className="size-2.5"
                                      aria-hidden
                                    />
                                    Bình thường
                                  </>
                                )}
                              </span>

                              {participant.flaggedAt && (
                                <span className="text-[11px] tabular-nums text-warning">
                                  {formatViolationDateTime(
                                    participant.flaggedAt,
                                  )}
                                </span>
                              )}
                            </div>

                            <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                              {nonZeroTypes.length > 0
                                ? nonZeroTypes
                                    .map(
                                      (type) =>
                                        `${PROCTORING_EVENT_LABELS[type]}: ${participant.eventCounts[type]}`,
                                    )
                                    .join(" · ")
                                : "Chưa phát sinh sự kiện"}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Panel phải – Event Investigation Timeline (65%) */}
        <section
          aria-labelledby="timeline-heading"
          className={cn(
            "min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background lg:flex lg:h-full",
            mobileTab === "timeline" ? "flex" : "hidden lg:flex",
          )}
        >
          {/* Fixed Timeline Header + Event Type Filter */}
          <div className="shrink-0 space-y-2.5 border-b border-border/60 bg-background p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="timeline-heading"
                    className="text-sm font-bold text-foreground"
                  >
                    Nhật ký sự kiện
                  </h2>
                  {selectedParticipant ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-secondary/45 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      <span className="truncate max-w-48">
                        {selectedParticipant.name}
                      </span>
                      {selectedParticipant.flagged && (
                        <ShieldAlert
                          className="size-3 text-warning"
                          aria-label="Cần xem xét"
                        />
                      )}
                      <button
                        type="button"
                        aria-label="Xem tất cả thí sinh"
                        onClick={() =>
                          navigateWithFilters({
                            participantId: null,
                            cursor: null,
                          })
                        }
                        className="rounded-full p-0.5 hover:bg-background"
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Tất cả thí sinh
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Hiển thị {numberFormat.format(timeline.items.length)} /{" "}
                  {numberFormat.format(timeline.totalFiltered)} sự kiện khớp bộ
                  lọc · Mới nhất trước
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="sr-only">Lọc loại sự kiện</span>
                  <select
                    aria-label="Lọc theo loại sự kiện"
                    value={filters.eventType ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      navigateWithFilters({
                        eventType: value
                          ? (value as ProctoringEventType)
                          : null,
                        cursor: null,
                      });
                    }}
                    className="h-8 rounded-xl border border-input bg-background px-2.5 text-xs font-medium text-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-none"
                  >
                    <option value="">Tất cả loại sự kiện</option>
                    {PROCTORING_EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {PROCTORING_EVENT_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedParticipant && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigateWithFilters({ participantId: null, cursor: null })
                    }
                    className="h-8 px-2.5 text-xs"
                  >
                    Xem tất cả
                  </Button>
                )}

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-8 px-2 text-xs"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    <span>Đặt lại</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Independently Scrollable Vertical Timeline Body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
            {overview.totalEvents === 0 ? (
              <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-xl bg-muted/35 px-4 py-10 text-center">
                <Clock3
                  className="mb-2 size-7 text-muted-foreground/60"
                  aria-hidden
                />
                <p className="text-sm font-semibold text-foreground">
                  Chưa có sự kiện bất thường nào
                </p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  Khi thí sinh phát sinh chuyển tab, dán code hoặc thoát toàn
                  màn hình trong giờ thi, nhật ký chi tiết sẽ hiển thị tại đây.
                </p>
              </div>
            ) : timeline.items.length === 0 ? (
              <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-xl bg-muted/35 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Không có sự kiện khớp bộ lọc
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedParticipant
                    ? `Thí sinh ${selectedParticipant.name} không có sự kiện phù hợp với bộ lọc hiện tại.`
                    : "Thử chọn thí sinh khác, đổi loại sự kiện hoặc đặt lại bộ lọc."}
                </p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleResetFilters}
                  >
                    Đặt lại bộ lọc
                  </Button>
                )}
              </div>
            ) : (
              <ol className="relative space-y-2.5 pl-7 before:absolute before:top-2.5 before:bottom-2.5 before:left-[13px] before:w-px before:bg-border">
                {timeline.items.map((item) => {
                  const Icon = EVENT_ICONS[item.type];
                  return (
                    <li key={item.id} className="relative">
                      <span
                        aria-hidden
                        className="absolute top-2.5 -left-7 grid size-7 place-items-center rounded-full bg-background"
                      >
                        <span
                          className={cn(
                            "grid size-7 place-items-center rounded-full border",
                            getEventBadgeTone(item.type),
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                      </span>

                      <div className="rounded-xl border border-border/70 bg-background px-3 py-2.5 transition-colors hover:bg-muted/25">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                getEventBadgeTone(item.type),
                              )}
                            >
                              {PROCTORING_EVENT_LABELS[item.type]}
                            </span>

                            {!selectedParticipant && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigateWithFilters({
                                    participantId: item.userId,
                                    cursor: null,
                                  })
                                }
                                className="truncate text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                              >
                                {item.participantName}
                              </button>
                            )}

                            {!selectedParticipant &&
                              item.participantFlagged && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                                  <ShieldAlert
                                    className="size-2.5"
                                    aria-hidden
                                  />
                                  Cần xem xét
                                </span>
                              )}
                          </div>

                          <time
                            dateTime={item.createdAt}
                            className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground"
                          >
                            {formatViolationDateTime(item.createdAt)}
                          </time>
                        </div>

                        {item.metadata.summary && (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {item.metadata.summary}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Fixed Timeline Pagination Footer */}
          {overview.totalEvents > 0 &&
            (timeline.items.length > 0 || filters.cursor) && (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-background px-3.5 py-2.5">
                <p className="text-xs text-muted-foreground">
                  {timeline.hasMore
                    ? "Còn sự kiện cũ hơn trong lịch sử."
                    : "Đã hiển thị hết các sự kiện khớp bộ lọc."}
                </p>
                <div className="flex items-center gap-2">
                  {filters.cursor && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigateWithFilters({ cursor: null })}
                      className="h-8 px-2.5 text-xs"
                    >
                      Trang đầu
                    </Button>
                  )}
                  {timeline.hasMore && timeline.nextCursor && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigateWithFilters({ cursor: timeline.nextCursor })
                      }
                      className="h-8 px-2.5 text-xs"
                    >
                      Xem sự kiện cũ hơn
                    </Button>
                  )}
                </div>
              </div>
            )}
        </section>
      </div>
    </div>
  );
}
