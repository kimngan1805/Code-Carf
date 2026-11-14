"use client";

import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeacherPathSummary } from "../types";
import { ALL_PATHS_FILTER } from "../utils";

const numberFormat = new Intl.NumberFormat("vi-VN");

export function PathEnrollmentChart({
  paths,
  selectedPathId,
  onSelectPath,
}: {
  paths: TeacherPathSummary[];
  selectedPathId: string;
  onSelectPath: (pathId: string) => void;
}) {
  const maxEnrolled = Math.max(1, ...paths.map((path) => path.enrolledCount));

  return (
    <section className="rounded-[1.75rem] border border-border/60 bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-primary">
            <BarChart3 className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold">
              Số học viên theo lộ trình
            </h2>
            <p className="text-xs text-muted-foreground">
              Nhấn vào một lộ trình để lọc số liệu chi tiết
            </p>
          </div>
        </div>

        <ul className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-secondary" aria-hidden />
            Đã đăng ký
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-highlight" aria-hidden />
            Đang học
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" aria-hidden />
            Hoàn thành
          </li>
        </ul>
      </div>

      {paths.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
          Chưa có dữ liệu học viên cho bộ lọc hiện tại.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {paths.map((path) => {
            const isSelected = selectedPathId === path.id;
            const enrolledPct = Math.round(
              (path.enrolledCount / maxEnrolled) * 100,
            );
            const activePct = Math.round(
              (path.activeLearners / maxEnrolled) * 100,
            );
            const completedPct = Math.round(
              (path.completedCount / maxEnrolled) * 100,
            );

            return (
              <button
                key={path.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() =>
                  onSelectPath(isSelected ? ALL_PATHS_FILTER : path.id)
                }
                className={cn(
                  "block w-full rounded-2xl border p-3.5 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-secondary/20 ring-2 ring-highlight/25"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{path.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    <strong className="font-semibold text-foreground">
                      {numberFormat.format(path.enrolledCount)}
                    </strong>{" "}
                    đăng ký · {numberFormat.format(path.activeLearners)} đang
                    học · {numberFormat.format(path.completedCount)} hoàn thành
                  </span>
                </div>

                {/* Layered horizontal bars scaled relative to the largest path */}
                <div
                  aria-hidden
                  className="relative mt-2.5 h-3.5 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-secondary transition-all duration-300"
                    style={{ width: `${enrolledPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-highlight/80 transition-all duration-300"
                    style={{ width: `${activePct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${completedPct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
