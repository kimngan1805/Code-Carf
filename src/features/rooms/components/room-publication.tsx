"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  LoaderCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSingleFlight } from "@/features/grading/single-flight";
import { PathStatusBadge } from "@/features/paths/components/path-badges";
import { changeRoomPublication } from "../publication-actions";

export interface RoomPublicationOutcome {
  started: boolean;
  ok: boolean;
  error: string | null;
  message: string | null;
}

/**
 * Điều phối thao tác xuất bản / chuyển về bản nháp của bài học với single-flight chống gửi trùng.
 */
export async function runRoomPublicationToggle(options: {
  flight: ReturnType<typeof createSingleFlight>;
  roomId: string;
  published: boolean;
  action: (input: {
    roomId: string;
    published: boolean;
  }) => Promise<{ error: string | null }>;
  onRefresh: () => void;
}): Promise<RoomPublicationOutcome> {
  const execution = await options.flight.run(async () => {
    try {
      const nextPublished = !options.published;
      const result = await options.action({
        roomId: options.roomId,
        published: nextPublished,
      });
      if (result.error) {
        return { ok: false, error: result.error, message: null };
      }
      options.onRefresh();
      return {
        ok: true,
        error: null,
        message: nextPublished
          ? "Đã xuất bản bài học. Học viên có thể truy cập khi lộ trình đã xuất bản."
          : "Đã chuyển bài học về bản nháp. Học viên không thể truy cập bài này.",
      };
    } catch {
      return {
        ok: false,
        error: "Không thể kết nối. Vui lòng thử lại.",
        message: null,
      };
    }
  });

  if (!execution.started) {
    return { started: false, ok: false, error: null, message: null };
  }
  return { started: true, ...execution.value };
}

export function RoomPublication({
  roomId,
  title,
  description,
  published,
  pathPublished,
  exerciseCount,
  previewHref,
  editHref,
}: {
  roomId: string;
  title: string;
  description: string;
  published: boolean;
  pathPublished: boolean;
  exerciseCount: number;
  previewHref: string;
  editHref: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const flightRef = useRef<ReturnType<typeof createSingleFlight> | null>(null);

  async function toggle() {
    flightRef.current ??= createSingleFlight();
    const flight = flightRef.current;
    if (flight.busy) return;

    setPending(true);
    setError("");
    setMessage("");

    const outcome = await runRoomPublicationToggle({
      flight,
      roomId,
      published,
      action: changeRoomPublication,
      onRefresh: () => router.refresh(),
    });

    if (!outcome.started) return;

    if (outcome.ok) {
      setMessage(outcome.message ?? "");
    } else {
      setError(outcome.error ?? "Chưa thể đổi trạng thái bài học.");
    }
    setPending(false);
  }

  const publishButton = (
    <Button
      type="button"
      variant={published ? "outline" : "default"}
      size="default"
      disabled={pending}
      onClick={toggle}
      aria-busy={pending}
      className={
        published
          ? "rounded-xl border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
          : "rounded-xl shadow-xs"
      }
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : published ? (
        <EyeOff className="size-4" aria-hidden />
      ) : (
        <Globe className="size-4" aria-hidden />
      )}
      {pending
        ? published
          ? "Đang cập nhật..."
          : "Đang xuất bản..."
        : published
          ? "Chuyển về bản nháp"
          : "Xuất bản bài học"}
    </Button>
  );

  const previewButton = (
    <Button asChild variant="secondary" size="default" className="rounded-xl">
      <Link href={previewHref} aria-label={`Xem như học viên: ${title}`}>
        <Eye className="size-4" aria-hidden />
        Xem như học viên
      </Link>
    </Button>
  );

  const editButton = (
    <Button
      asChild
      variant="outline"
      size="default"
      className="rounded-xl border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
    >
      <Link href={editHref}>
        <Pencil className="size-4" aria-hidden />
        Chỉnh sửa bài học
      </Link>
    </Button>
  );

  return (
    <header className="space-y-4 rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Nội dung bài học
            </p>
            <PathStatusBadge published={published} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground break-words sm:text-3xl">
            {title}
          </h1>
          {description.trim() && (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground break-words">
              {description}
            </p>
          )}
          <p className="pt-0.5 text-xs text-muted-foreground tabular-nums">
            {exerciseCount > 0 ? `${exerciseCount} bài tập` : "Chưa có bài tập"}
            {!pathPublished
              ? " · Lộ trình chứa bài này đang ở bản nháp"
              : published
                ? " · Học viên đã đăng ký có thể truy cập"
                : " · Chỉ hiển thị trong khu vực giảng viên và xem trước"}
          </p>
        </div>

        {/* Phân cấp hành động: khi Draft ưu tiên Xuất bản; khi Published ưu tiên Xem trước & Chỉnh sửa */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {published ? (
            <>
              {previewButton}
              {editButton}
              {publishButton}
            </>
          ) : (
            <>
              {publishButton}
              {previewButton}
              {editButton}
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
      )}
      {message && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{message}</p>
        </div>
      )}
    </header>
  );
}
