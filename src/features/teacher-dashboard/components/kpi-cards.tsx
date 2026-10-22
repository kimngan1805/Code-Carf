import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeacherDashboardKpis } from "../types";

const numberFormat = new Intl.NumberFormat("vi-VN");

interface KpiItem {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tileClass: string;
}

export function TeacherKpiCards({ kpis }: { kpis: TeacherDashboardKpis }) {
  const items: KpiItem[] = [
    {
      label: "Học viên đăng ký",
      value: numberFormat.format(kpis.totalLearners),
      hint: `${numberFormat.format(kpis.activeLearners)} đang học tích cực`,
      icon: Users,
      tileClass: "bg-secondary/70 text-primary",
    },
    {
      label: "Tiến độ hoàn thành",
      value: `${kpis.avgCompletionRate}%`,
      hint: `${numberFormat.format(kpis.completedLearners)}/${numberFormat.format(kpis.totalLearners)} lượt hoàn thành`,
      icon: GraduationCap,
      tileClass: "bg-highlight/20 text-primary",
    },
    {
      label: "Tỷ lệ pass bài tập",
      value: `${kpis.avgPassRate}%`,
      hint: "Trung bình các bài đã nộp",
      icon: CheckCircle2,
      tileClass: "bg-success/15 text-success",
    },
    {
      label: "Điểm nghẽn",
      value: numberFormat.format(kpis.bottleneckCount),
      hint:
        kpis.criticalBottleneckCount > 0
          ? `${kpis.criticalBottleneckCount} Room tỷ lệ pass < 30%`
          : "Không có Room dưới 30%",
      icon: AlertTriangle,
      tileClass: "bg-accent/15 text-accent-strong",
    },
  ];

  return (
    <section aria-label="Chỉ số tổng quan">
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "rounded-[1.75rem] border border-border/60 bg-background p-5",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm font-semibold text-muted-foreground">
                {item.label}
              </dt>
              <span
                aria-hidden
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-2xl",
                  item.tileClass,
                )}
              >
                <item.icon className="size-5" />
              </span>
            </div>
            <dd className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
              {item.value}
            </dd>
            <p className="mt-1.5 text-xs text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
