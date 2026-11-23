"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportExerciseAction, type ReportState } from "../actions";
import { REPORT_KINDS, REPORT_MAX_LENGTH } from "../rules";

export function ExerciseReportForm({ exerciseId }: { exerciseId: string }) {
  const id = useId();
  const [kind, setKind] = useState("");
  const [description, setDescription] = useState("");
  const [state, action, pending] = useActionState<ReportState, FormData>(
    reportExerciseAction.bind(null, exerciseId),
    {},
  );
  return (
    <details className="rounded-2xl border bg-background p-4">
      <summary className="cursor-pointer rounded-md text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2">
        <Flag className="mr-2 inline size-4" aria-hidden />
        Báo lỗi đề
      </summary>
      <form
        action={action}
        className="mt-4 space-y-4"
        aria-label="Báo lỗi bài tập"
        aria-busy={pending}
      >
        <Link
          href="/hv/reports"
          className="inline-block text-sm text-primary underline"
        >
          Xem báo lỗi và phản hồi của tôi
        </Link>
        <p className="text-sm text-muted-foreground">
          Chọn loại lỗi và mô tả vấn đề bạn gặp ở bài tập này.
        </p>
        <div className="space-y-1">
          <label htmlFor={`${id}-kind`} className="text-sm font-medium">
            Loại lỗi <span aria-hidden>*</span>
          </label>
          <select
            id={`${id}-kind`}
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            required
            disabled={pending}
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm focus-visible:outline-2"
          >
            <option value="" disabled>
              Chọn loại lỗi
            </option>
            {REPORT_KINDS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-description`} className="text-sm font-medium">
            Mô tả lỗi <span aria-hidden>*</span>
          </label>
          <textarea
            id={`${id}-description`}
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            maxLength={REPORT_MAX_LENGTH}
            rows={4}
            disabled={pending}
            aria-describedby={`${id}-hint`}
            className="block w-full resize-y rounded-xl border bg-background p-3 text-sm focus-visible:outline-2"
            placeholder="Ví dụ: đề yêu cầu tổng hai số nhưng ví dụ cho kết quả khác..."
          />
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            Tối đa {REPORT_MAX_LENGTH} ký tự. Mỗi bài tập gửi một báo cáo trong
            5 phút.
          </p>
        </div>
        {state.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={
              state.ok ? "text-sm text-success" : "text-sm text-destructive"
            }
          >
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Đang gửi..." : "Gửi báo lỗi"}
        </Button>
      </form>
    </details>
  );
}
