import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSubmissionHistory } from "@/features/grading/history";
import { SubmissionHistoryView } from "@/features/grading/components/submission-history-view";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Lịch sử nộp bài · Code Carf",
};

export default async function SubmissionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const history = await getSubmissionHistory(page).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/hv/submissions");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });
  return <SubmissionHistoryView history={history} />;
}
