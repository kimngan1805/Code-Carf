"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { changeReportAction } from "../handling-actions";
import { REPORT_STATUS_LABELS, REPORT_STATUSES } from "../handling-rules";

export function ReportHandlingForm({
  id,
  status,
  version,
}: {
  id: string;
  status: string;
  version: number;
}) {
  const field = useId();
  const [next, setNext] = useState(status);
  const [resolution, setResolution] = useState("");
  const [state, action, pending] = useActionState(
    changeReportAction.bind(null, id),
    {},
  );
  return (
    <form
      action={action}
      className="mt-4 space-y-3 border-t pt-4"
      aria-label="Xử lý báo lỗi"
    >
      <input type="hidden" name="version" value={version} />
      <label htmlFor={`${field}-status`} className="block text-sm font-medium">
        Trạng thái
      </label>
      <select
        id={`${field}-status`}
        name="status"
        value={next}
        onChange={(event) => setNext(event.target.value)}
        disabled={pending}
        className="h-10 w-full rounded-xl border bg-background px-3 focus-visible:outline-2"
      >
        {REPORT_STATUSES.map((item) => (
          <option key={item} value={item}>
            {REPORT_STATUS_LABELS[item]}
          </option>
        ))}
      </select>
      {next === "RESOLVED" && (
        <>
          <label
            htmlFor={`${field}-resolution`}
            className="block text-sm font-medium"
          >
            Kết quả xử lý gửi học viên
          </label>
          <textarea
            id={`${field}-resolution`}
            name="resolution"
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            required
            maxLength={2000}
            rows={3}
            disabled={pending}
            className="block w-full rounded-xl border bg-background p-3 text-sm focus-visible:outline-2"
          />
        </>
      )}
      {next !== "RESOLVED" && (
        <input type="hidden" name="resolution" value="" />
      )}
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className="text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending || next === status}>
        {pending ? "Đang lưu..." : "Lưu trạng thái"}
      </Button>
    </form>
  );
}
