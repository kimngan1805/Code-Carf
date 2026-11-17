"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeRoomPublication } from "../publication-actions";

export function RoomPublication({
  roomId,
  published,
}: {
  roomId: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    setMessage("");

    try {
      const result = await changeRoomPublication({
        roomId,
        published: !published,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(
          published
            ? "Đã chuyển bài học về bản nháp. Học viên không thể truy cập bài này."
            : "Đã xuất bản bài học. Học viên có thể truy cập khi lộ trình đã xuất bản.",
        );
        router.refresh();
      }
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Trạng thái hiển thị:{" "}
            <span className={published ? "text-success" : "text-warning"}>
              {published ? "Đã xuất bản" : "Bản nháp"}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {published
              ? "Học viên đã đăng ký lộ trình có thể học bài này (khi lộ trình đã xuất bản)."
              : "Bản nháp chỉ hiển thị trong khu vực giảng viên và chế độ xem trước."}
          </p>
        </div>

        <Button
          type="button"
          variant={published ? "outline" : "default"}
          disabled={pending}
          onClick={toggle}
        >
          {pending && (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          )}
          {published ? "Chuyển về bản nháp" : "Xuất bản bài học"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      )}
    </div>
  );
}
