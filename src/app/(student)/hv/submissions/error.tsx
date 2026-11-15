"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SubmissionsError({ retry }: { retry: () => void }) {
  return (
    <section
      role="alert"
      className="mx-auto max-w-3xl space-y-4 rounded-2xl border bg-background p-6"
    >
      <h1 className="text-xl font-bold">Chưa tải được lịch sử nộp bài</h1>
      <p className="text-muted-foreground">
        Vui lòng kiểm tra kết nối và thử lại.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => retry()}>Thử lại</Button>
        <Button asChild variant="outline">
          <Link href="/hv/dashboard">Về trang chủ</Link>
        </Button>
      </div>
    </section>
  );
}
