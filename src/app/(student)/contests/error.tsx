"use client";
import { Button } from "@/components/ui/button";

export default function ContestsError({ reset }: { reset: () => void }) {
  return (
    <section
      className="rounded-2xl border bg-background p-10 text-center"
      role="alert"
    >
      <h1 className="text-xl font-bold">Chưa tải được cuộc thi</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Vui lòng kiểm tra kết nối và thử lại.
      </p>
      <Button onClick={reset} className="mt-5">
        Thử lại
      </Button>
    </section>
  );
}
