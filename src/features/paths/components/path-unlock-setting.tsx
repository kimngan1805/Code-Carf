"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { changePathUnlock } from "../management-actions";

export function PathUnlockSetting({
  pathId,
  initialEnabled,
}: {
  pathId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function change(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await changePathUnlock({ pathId, enabled: next });
        if (result.error) {
          setEnabled(previous);
          setError(result.error);
        } else setMessage("Đã lưu cấu hình.");
      } catch {
        setEnabled(previous);
        setError("Không thể kết nối. Vui lòng thử lại.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start justify-between gap-3">
        <span className="flex items-start gap-2.5">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl",
              enabled
                ? "bg-secondary/70 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {enabled ? (
              <Lock className="size-4" />
            ) : (
              <Unlock className="size-4" />
            )}
          </span>
          <span className="space-y-1">
            <span className="block text-sm font-semibold text-foreground">
              Mở khóa bài học tuần tự
            </span>
            <span className="block text-xs leading-5 text-muted-foreground">
              {enabled
                ? "Học viên hoàn thành bài học trước mới được mở bài tiếp theo."
                : "Học viên đã đăng ký có thể mở mọi bài học theo thứ tự tùy chọn."}
            </span>
          </span>
        </span>

        <span className="relative mt-0.5 inline-flex shrink-0 items-center">
          <input
            type="checkbox"
            role="switch"
            checked={enabled}
            disabled={pending}
            onChange={(event) => change(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={cn(
              "h-6 w-11 rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50",
              enabled ? "border-primary bg-primary" : "border-border bg-muted",
            )}
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0.5 size-5 rounded-full bg-background shadow-xs transition-transform",
              enabled ? "translate-x-5" : "translate-x-0",
            )}
          />
        </span>
      </label>

      {(pending || message) && (
        <p
          role="status"
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium",
            pending ? "text-muted-foreground" : "text-success",
          )}
        >
          {pending ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="size-3.5" aria-hidden />
          )}
          {pending ? "Đang lưu..." : message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/10 p-2.5 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
