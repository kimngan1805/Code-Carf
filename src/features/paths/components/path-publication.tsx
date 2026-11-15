"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changePathPublication } from "../publication-actions";

export function PathPublication({
  pathId,
  published,
}: {
  pathId: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  async function change() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await changePathPublication({
        pathId,
        published: !published,
      });
      if (result.error) setError(result.error);
      else {
        setMessage(
          published
            ? "Đã ẩn lộ trình khỏi danh sách học viên."
            : "Đã xuất bản. Học viên có thể xem và đăng ký lộ trình.",
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
    <div className="space-y-2 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {published
            ? "Học viên có thể xem và đăng ký lộ trình này."
            : "Bản nháp chỉ hiển thị trong trang quản lý của giáo viên."}
        </p>
        <Button
          type="button"
          variant={published ? "outline" : "default"}
          disabled={pending}
          onClick={change}
        >
          {pending && (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          )}
          {pending ? "Đang lưu..." : published ? "Ẩn lộ trình" : "Xuất bản"}
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
