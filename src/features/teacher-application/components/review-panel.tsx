"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reviewApplication } from "../review-actions";

export function ReviewPanel({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(decision: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const result = await reviewApplication({ id, decision, note });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border bg-background p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Quyết định</h2>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">
          Ghi chú gửi người nộp (bắt buộc khi từ chối)
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          rows={4}
          className="w-full rounded-lg border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} onClick={() => decide("approve")}>
          Duyệt hồ sơ
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => decide("reject")}
        >
          Từ chối
        </Button>
      </div>
    </section>
  );
}
