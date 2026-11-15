import Link from "next/link";
import { BadgeCheck, ChevronRight, Users } from "lucide-react";
import { getAdminSummary } from "@/features/admin/service";

export const metadata = { title: "Quản trị · Code Carf" };

export default async function AdminPage() {
  const summary = await getAdminSummary();
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Khu vực quản trị
        </p>
        <h1 className="text-2xl font-bold text-primary">Tổng quan</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-background p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Người dùng</p>
            <span className="grid size-10 place-items-center rounded-xl bg-secondary/60 text-primary">
              <Users className="size-5" aria-hidden />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold">{summary.users}</p>
        </div>

        <Link
          href="/admin/teacher-applications"
          className="group rounded-2xl border bg-background p-5 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Hồ sơ giảng viên chờ duyệt
            </p>
            <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-strong">
              <BadgeCheck className="size-5" aria-hidden />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold">
            {summary.pendingTeacherApplications}
          </p>
          <p className="mt-1 flex items-center text-sm font-semibold text-primary">
            Xem danh sách
            <ChevronRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </p>
        </Link>
      </div>
    </div>
  );
}
