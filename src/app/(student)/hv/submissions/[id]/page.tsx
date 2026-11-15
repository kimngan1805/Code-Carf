import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSubmissionDetail } from "@/features/grading/history";
import { SubmissionDetailView } from "@/features/grading/components/submission-detail-view";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Chi tiết bài nộp · Code Carf",
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await getSubmissionDetail(id).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 404) notFound();
      if (error.status === 401)
        redirect(
          `/login?callbackUrl=${encodeURIComponent(`/hv/submissions/${id}`)}`,
        );
      // someone else's submission (or a non-student): never show it
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });
  return <SubmissionDetailView submission={submission} />;
}
