import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SubmissionNotFound() {
  return (
    <section className="mx-auto max-w-3xl space-y-4 rounded-2xl border bg-background p-6">
      <h1 className="text-xl font-bold">Không tìm thấy bài nộp</h1>
      <p className="text-muted-foreground">
        Bài nộp không tồn tại hoặc không thuộc lịch sử luyện tập của bạn.
      </p>
      <Button asChild>
        <Link href="/hv/submissions">Về lịch sử nộp bài</Link>
      </Button>
    </section>
  );
}
