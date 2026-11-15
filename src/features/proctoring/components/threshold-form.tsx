"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ThresholdForm({
  slug,
  threshold,
}: {
  slug: string;
  threshold: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(threshold);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        setPending(true);
        setMessage("");
        try {
          const response = await fetch(
            `/api/contests/${encodeURIComponent(slug)}/proctoring-settings`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ threshold: value }),
            },
          );
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error?.message ?? "Chưa thể lưu ngưỡng.");
          setMessage("Đã lưu cấu hình.");
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Mất kết nối. Vui lòng thử lại.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1.5 text-sm font-medium">
          <span className="block">Số lần tối đa trước khi gắn cờ</span>
          <input
            type="number"
            required
            min={1}
            max={100}
            step={1}
            value={Number.isNaN(value) ? "" : value}
            disabled={pending}
            onChange={(event) => setValue(event.target.valueAsNumber)}
            className="h-10 w-24 rounded-lg border bg-background px-3 focus-visible:outline-2"
          />
        </label>
        <Button
          disabled={
            pending || !Number.isInteger(value) || value < 1 || value > 100
          }
        >
          {pending ? "Đang lưu..." : "Lưu ngưỡng"}
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Chuyển tab và dán code đều được tính. Với ngưỡng{" "}
        {Number.isFinite(value) ? value : threshold}, lần thứ{" "}
        {(Number.isFinite(value) ? value : threshold) + 1} sẽ gắn cờ để xem xét;
        bài làm vẫn được nộp và chấm bình thường. Tăng ngưỡng không tự xóa cờ đã
        có.
      </p>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
