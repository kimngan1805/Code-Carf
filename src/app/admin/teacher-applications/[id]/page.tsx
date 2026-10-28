import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { ReviewPanel } from "@/features/teacher-application/components/review-panel";
import { teachingLevelOptions } from "@/features/teacher-application/rules";
import { getApplicationForReview } from "@/features/teacher-application/service";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Chi tiết hồ sơ giảng viên · Code Carf" };

const statusLabel = {
  [ApplicationStatus.PENDING]: "Chờ duyệt",
  [ApplicationStatus.APPROVED]: "Đã duyệt",
  [ApplicationStatus.REJECTED]: "Từ chối",
};

export default async function TeacherApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const application = await getApplicationForReview(id).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401)
        redirect(`/login?callbackUrl=/admin/teacher-applications/${id}`);
      if (error.status === 403) redirect("/forbidden");
      if (error.status === 404) notFound();
    }
    throw error;
  });
  const level = teachingLevelOptions.find(
    (option) => option.value === application.teachingLevel,
  )?.label;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
      <div>
        <Link
          href="/admin/teacher-applications"
          className="text-sm text-muted-foreground"
        >
          ← Danh sách hồ sơ
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-primary">
          Hồ sơ của {application.user.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {statusLabel[application.status]} · {application.user.email}
        </p>
      </div>

      <dl className="grid gap-3 rounded-2xl border bg-background p-4 text-sm sm:grid-cols-2 sm:p-6">
        <div>
          <dt className="text-muted-foreground">Cấp giảng dạy</dt>
          <dd className="font-semibold">{level}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tỉnh / thành</dt>
          <dd className="font-semibold">{application.province}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Trường công tác</dt>
          <dd className="font-semibold">{application.schoolName}</dd>
        </div>
      </dl>

      <section className="space-y-3 rounded-2xl border bg-background p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Minh chứng</h2>
        <ul className="space-y-3">
          {application.documents.map((document) => {
            const href = `/api/admin/teacher-applications/${application.id}/documents/${document.id}`;
            return (
              <li key={document.id} className="space-y-2">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary underline"
                >
                  {document.fileName}
                </a>
                {document.mimeType.startsWith("image/") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={href}
                    alt={document.fileName}
                    className="max-h-96 rounded-lg border"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {application.status === ApplicationStatus.PENDING ? (
        <ReviewPanel id={application.id} />
      ) : (
        <section className="rounded-2xl border bg-background p-4 text-sm sm:p-6">
          <p>
            {statusLabel[application.status]} bởi{" "}
            <span className="font-semibold">
              {application.reviewer?.name ?? "—"}
            </span>
            {application.reviewedAt &&
              ` lúc ${application.reviewedAt.toLocaleString("vi-VN")}`}
          </p>
          {application.reviewNote && (
            <p className="mt-2">Ghi chú: {application.reviewNote}</p>
          )}
        </section>
      )}
    </main>
  );
}
