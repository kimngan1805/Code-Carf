"use client";

import {
  AlertTriangle,
  BookOpen,
  Braces,
  CodeXml,
  Database,
  Globe,
  Layers,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TeacherPathSummary } from "../types";
import { ALL_PATHS_FILTER } from "../utils";

const numberFormat = new Intl.NumberFormat("vi-VN");
const pathIcons: LucideIcon[] = [BookOpen, Database, Globe, Braces, CodeXml];
const tileTones = [
  "bg-secondary/70 text-primary",
  "bg-accent/15 text-accent-strong",
  "bg-highlight/20 text-primary",
];

export function TeacherPathList({
  paths,
  selectedPathId,
  onSelectPath,
  onResetFilters,
}: {
  paths: TeacherPathSummary[];
  selectedPathId: string;
  onSelectPath: (pathId: string) => void;
  onResetFilters: () => void;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border/60 bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-primary">
            <BookOpen className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold">
              Danh sách lộ trình & tiến độ
            </h2>
            <p className="text-xs text-muted-foreground">
              Theo dõi tỷ lệ hoàn thành và mức độ đạt bài của học viên
            </p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
          {paths.length} lộ trình
        </span>
      </div>

      {paths.length === 0 ? (
        <div className="mt-5 rounded-3xl bg-muted/50 px-6 py-10 text-center">
          <p className="text-sm font-semibold">
            Không tìm thấy lộ trình phù hợp
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thử đổi từ khóa tìm kiếm hoặc bỏ lọc lộ trình hiện tại.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onResetFilters}
            className="mt-4 rounded-full"
          >
            Xem tất cả lộ trình
          </Button>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {paths.map((path, index) => {
            const Icon = pathIcons[index % pathIcons.length];
            const tileTone = tileTones[index % tileTones.length];
            const isSelected = selectedPathId === path.id;

            return (
              <li key={path.id}>
                <article
                  className={cn(
                    "flex h-full flex-col rounded-3xl border bg-background p-4 transition-shadow",
                    isSelected
                      ? "border-primary ring-2 ring-highlight/20"
                      : "border-border/60 hover:shadow-md hover:shadow-primary/5",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-2xl",
                        tileTone,
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {path.title}
                        </h3>
                        {path.bottleneckRoomCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                            <AlertTriangle className="size-3" aria-hidden />
                            {path.bottleneckRoomCount} cảnh báo
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {path.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Layers className="size-3.5" aria-hidden />
                      {path.roomCount} bài học · {path.exerciseCount} bài tập
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Users className="size-3.5" aria-hidden />
                      {numberFormat.format(path.enrolledCount)} học viên
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">
                        Hoàn thành lộ trình
                      </span>
                      <span className="font-semibold tabular-nums">
                        {path.completionRate}%
                      </span>
                    </div>
                    <Progress
                      value={path.completionRate / 100}
                      label={`Tiến độ hoàn thành ${path.title}`}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Tỷ lệ pass:{" "}
                      <strong className="font-semibold text-foreground">
                        {path.passRate}%
                      </strong>
                    </span>
                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={() =>
                        onSelectPath(isSelected ? ALL_PATHS_FILTER : path.id)
                      }
                    >
                      {isSelected ? "Đang lọc" : "Xem chỉ số"}
                    </Button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
