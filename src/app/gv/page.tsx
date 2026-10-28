import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routeRoles } from "@/features/auth/permissions";
import { requireRole } from "@/features/auth/service";
import { TeacherDashboardView } from "@/features/teacher-dashboard/components/teacher-dashboard-view";
import { MOCK_TEACHER_DASHBOARD } from "@/features/teacher-dashboard/mock-data";
import { AppError } from "@/lib/errors";

export const metadata = {
  title: "Tổng quan giảng dạy · Code Carf",
};

export default async function CreatorPage() {
  await requireRole(routeRoles["/gv"]).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/gv");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/gv/paths">Quản lý lộ trình</Link>
        </Button>
      </div>
      <TeacherDashboardView data={MOCK_TEACHER_DASHBOARD} />
    </div>
  );
}
