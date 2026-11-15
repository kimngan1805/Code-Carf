import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { getApplicationQueue } from "@/features/teacher-application/service";
import { teachingLevelOptions } from "@/features/teacher-application/rules";
import { AppError } from "@/lib/errors";
import { cn } from "@/lib/utils";

export const metadata = { title: "Duyệt hồ sơ giảng viên · Code Carf" };

const tabs = [
  { status: ApplicationStatus.PENDING, label: "Chờ duyệt" },
  { status: ApplicationStatus.APPROVED, label: "Đã duyệt" },
  { status: ApplicationStatus.REJECTED, label: "Từ chối" },
] as const;

export default async function TeacherApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: raw } = await searchParams;
  const status =
    tabs.find((tab) => tab.status === raw)?.status ?? ApplicationStatus.PENDING;
  const { applications, totals } = await getApplicationQueue(status).catch(
    (error) => {
      if (error instanceof AppError) {
        if (error.status === 401)
          redirect("/login?callbackUrl=/admin/teacher-applications");
        if (error.status === 403) redirect("/forbidden");
      }
      throw error;
    },
  );

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
      <div>
        <Link href="/admin" className="text-sm text-muted-foreground">
          ← Admin
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-primary">
          Duyệt hồ sơ giảng viên
        </h1>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Lọc theo trạng thái">
        {tabs.map((tab) => (
          <Link
            key={tab.status}
            href={`/admin/teacher-applications?status=${tab.status}`}
            aria-current={tab.status === status ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold",
              tab.status === status
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {tab.label} ({totals[tab.status] ?? 0})
          </Link>
        ))}
      </nav>

      {applications.length === 0 ? (
        <p className="rounded-xl border bg-background p-4">
          Không có hồ sơ nào.
        </p>
      ) : (
        <ul className="space-y-3">
          {applications.map((application) => (
            <li key={application.id}>
              <Link
                href={`/admin/teacher-applications/${application.id}`}
                className="block rounded-2xl border bg-background p-4 hover:bg-muted/40 sm:p-5"
              >
                <p className="font-semibold">
                  {application.user.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {application.user.email}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {application.schoolName} · {application.province} ·{" "}
                  {
                    teachingLevelOptions.find(
                      (option) => option.value === application.teachingLevel,
                    )?.label
                  }{" "}
                  · {application._count.documents} tệp
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Nộp lúc {application.createdAt.toLocaleString("vi-VN")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
