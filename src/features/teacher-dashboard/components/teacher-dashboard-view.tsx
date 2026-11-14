"use client";

import { useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TeacherDashboardData } from "../types";
import { ALL_PATHS_FILTER, buildTeacherOverviewView } from "../utils";
import { TeacherKpiCards } from "./kpi-cards";
import { PathEnrollmentChart } from "./path-enrollment-chart";
import { TeacherPathList } from "./path-progress-list";
import { RoomAlertsPanel } from "./room-alerts-panel";

export function TeacherDashboardView({ data }: { data: TeacherDashboardData }) {
  const [selectedPathId, setSelectedPathId] =
    useState<string>(ALL_PATHS_FILTER);
  const [searchQuery, setSearchQuery] = useState("");

  const view = buildTeacherOverviewView(data, selectedPathId, searchQuery);
  const hasActiveFilter =
    selectedPathId !== ALL_PATHS_FILTER || searchQuery.trim().length > 0;

  function resetFilters() {
    setSelectedPathId(ALL_PATHS_FILTER);
    setSearchQuery("");
  }

  return (
    <div className="space-y-6">
      {/* Header & Path filter */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Không gian giảng viên
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Tổng quan giảng dạy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.lastUpdatedLabel}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-64">
            <span className="sr-only">Tìm lộ trình hoặc bài học cảnh báo</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Lọc theo tên lộ trình, bài học..."
              className="h-10 rounded-full pl-10"
            />
          </label>
          {hasActiveFilter && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-10 shrink-0 rounded-full px-4"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Đặt lại
            </Button>
          )}
        </div>
      </div>

      {/* Path filter pills */}
      <div
        role="group"
        aria-label="Lọc theo lộ trình"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        <button
          type="button"
          aria-pressed={selectedPathId === ALL_PATHS_FILTER}
          onClick={() => setSelectedPathId(ALL_PATHS_FILTER)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
            selectedPathId === ALL_PATHS_FILTER
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground/80 hover:bg-muted",
          )}
        >
          Tất cả lộ trình ({data.paths.length})
        </button>
        {data.paths.map((path) => {
          const active = selectedPathId === path.id;
          return (
            <button
              key={path.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setSelectedPathId(active ? ALL_PATHS_FILTER : path.id)
              }
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground/80 hover:bg-muted",
              )}
            >
              {path.title}
            </button>
          );
        })}
      </div>

      {/* 4 KPI cards */}
      <TeacherKpiCards kpis={view.kpis} />

      {/* Main grid: Chart + Path list | Bottleneck Room Alerts */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <PathEnrollmentChart
            paths={view.chartPaths}
            selectedPathId={selectedPathId}
            onSelectPath={setSelectedPathId}
          />
          <TeacherPathList
            paths={view.paths}
            selectedPathId={selectedPathId}
            onSelectPath={setSelectedPathId}
            onResetFilters={resetFilters}
          />
        </div>

        <div className="self-start">
          <RoomAlertsPanel
            alerts={view.roomAlerts}
            selectedPathId={selectedPathId}
            onSelectPath={setSelectedPathId}
          />
        </div>
      </div>
    </div>
  );
}
