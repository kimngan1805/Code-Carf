"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Globe,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { changePathPublication } from "../publication-actions";
import { PathStatusBadge } from "./path-badges";

export function PathPublication({
  pathId,
  published,
  roomCount,
}: {
  pathId: string;
  published: boolean;
  /** Thông tin gợi ý sẵn sàng xuất bản (chỉ hiển thị, backend vẫn xác thực đầy đủ). */
  roomCount?: number;
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

  const missingLessons = !published && roomCount === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Trạng thái xuất bản
        </h2>
        <PathStatusBadge published={published} />
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        {published
          ? "Lộ trình đang hiển thị công khai trên danh mục. Học viên có thể tìm kiếm và đăng ký học."
          : missingLessons
            ? "Lộ trình đang ở dạng bản nháp. Thêm ít nhất 1 bài học có nội dung trước khi xuất bản."
            : "Bản nháp chỉ hiển thị trong không gian giảng viên. Xuất bản khi bạn sẵn sàng mở cho học viên."}
      </p>

      <Button
        type="button"
        variant={published ? "outline" : "default"}
        disabled={pending}
        onClick={change}
        className="w-full"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : published ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Globe className="size-4" aria-hidden />
        )}
        {pending
          ? "Đang lưu..."
          : published
            ? "Ẩn lộ trình"
            : "Xuất bản lộ trình"}
      </Button>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs leading-5 text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
      {message && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-success/25 bg-success/10 p-3 text-xs leading-5 text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
