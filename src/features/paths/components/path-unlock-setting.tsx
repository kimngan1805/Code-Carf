"use client";

import { useState, useTransition } from "react";
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
    <div className="space-y-2">
      <label className="flex items-start gap-3 font-semibold">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(event) => change(event.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        Mở khóa Room tuần tự
      </label>
      <p className="text-sm text-muted-foreground">
        {enabled
          ? "Học viên hoàn thành Room trước mới được mở Room tiếp theo."
          : "Học viên đã đăng ký được mở mọi Room trong lộ trình đã xuất bản."}
      </p>
      <p role="status" className="text-sm text-muted-foreground">
        {pending ? "Đang lưu..." : message}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
