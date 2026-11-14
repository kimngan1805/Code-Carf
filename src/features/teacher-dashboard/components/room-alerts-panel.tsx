"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeacherRoomAlert } from "../types";

export function RoomAlertsPanel({
  alerts,
  selectedPathId,
  onSelectPath,
}: {
  alerts: TeacherRoomAlert[];
  selectedPathId: string;
  onSelectPath: (pathId: string) => void;
}) {
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(
    alerts[0]?.id ?? null,
  );

  const visibleAlerts = criticalOnly
    ? alerts.filter((alert) => alert.passRate < 30)
    : alerts;

  return (
    <section className="rounded-[1.75rem] border border-border/60 bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent-strong">
            <AlertTriangle className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold">Room cần chú ý</h2>
            <p className="text-xs text-muted-foreground">
              Bài học có tỷ lệ pass thấp hoặc nhiều học viên bị kẹt
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-pressed={criticalOnly}
          onClick={() => setCriticalOnly((current) => !current)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            criticalOnly
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          {criticalOnly ? "Đang lọc < 30%" : "Chỉ < 30% pass"}
        </button>
      </div>

      {visibleAlerts.length === 0 ? (
        <div className="mt-5 rounded-3xl bg-success/5 px-5 py-8 text-center">
          <CheckCircle2 className="mx-auto size-7 text-success" aria-hidden />
          <p className="mt-2 text-sm font-semibold">
            Không có điểm nghẽn nổi bật
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {criticalOnly
              ? "Không có Room nào có tỷ lệ pass dưới 30% trong phạm vi đang chọn."
              : "Tất cả các Room hiện đạt ngưỡng ổn định."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {visibleAlerts.map((alert) => {
            const isCritical = alert.passRate < 30;
            const expanded = expandedId === alert.id;

            return (
              <li
                key={alert.id}
                className={cn(
                  "rounded-2xl border p-3.5 transition-colors",
                  isCritical
                    ? "border-destructive/25 bg-destructive/5"
                    : "border-warning/25 bg-warning/5",
                )}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedId((current) =>
                      current === alert.id ? null : alert.id,
                    )
                  }
                  className="flex w-full items-start gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                          isCritical
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning",
                        )}
                      >
                        {alert.passRate}% pass
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {alert.pathTitle}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">
                      Bài {alert.position}: {alert.roomTitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {alert.stuckLearners}/{alert.learnersAttempted} học viên
                      đang kẹt · TB {alert.avgAttempts} lần nộp
                    </p>
                  </div>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </button>

                {expanded && (
                  <div className="mt-3 border-t border-border/60 pt-3 text-xs">
                    <p className="text-muted-foreground">
                      Bài vướng nhiều nhất:{" "}
                      <span className="font-semibold text-foreground">
                        {alert.topFailingExercise}
                      </span>
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        Thống kê chi tiết từng Room sẽ mở ở bước tiếp theo.
                      </span>
                      {selectedPathId !== alert.pathId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-full px-3 text-xs"
                          onClick={() => onSelectPath(alert.pathId)}
                        >
                          Lọc lộ trình này
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
