"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSingleFlight } from "@/features/grading/single-flight";
import { cn } from "@/lib/utils";
import { deletePathAction } from "../management-actions";

export interface DeletePathOutcome {
  started: boolean;
  ok: boolean;
  error: string | null;
  message: string | null;
}

/**
 * Điều phối thao tác xóa mềm lộ trình với cơ chế single-flight chống gửi trùng.
 * Tách thành hàm thuần để kiểm thử tự động luồng xác nhận, lỗi và điều hướng.
 */
export async function runDeletePath(options: {
  flight: ReturnType<typeof createSingleFlight>;
  pathId: string;
  action: (input: { pathId: string }) => Promise<{ error: string | null }>;
  redirectTo?: string;
  onNavigate: (href: string) => void;
  onRefresh: () => void;
}): Promise<DeletePathOutcome> {
  const execution = await options.flight.run(async () => {
    try {
      const result = await options.action({ pathId: options.pathId });
      if (result.error) {
        return { ok: false, error: result.error, message: null };
      }
      if (options.redirectTo) {
        options.onNavigate(options.redirectTo);
      }
      options.onRefresh();
      return {
        ok: true,
        error: null,
        message:
          "Đã xóa lộ trình. Dữ liệu học tập của học viên vẫn được bảo toàn.",
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

export function DeletePathDialog({
  open,
  pathTitle,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pathTitle: string;
  pending: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const focusables = [cancelRef.current, confirmRef.current].filter(
          (el): el is HTMLButtonElement => !!el && !el.disabled,
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, pending, onClose]);

  if (!open) return null;

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl">
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive"
            >
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <h2
                id={titleId}
                className="text-lg font-bold tracking-tight text-foreground"
              >
                Xác nhận xóa lộ trình
              </h2>
              <p className="text-xs font-medium text-muted-foreground">
                Thao tác xóa mềm · Ẩn khỏi danh sách quản lý và học viên
              </p>
            </div>
          </div>

          <div id={descId} className="space-y-3 text-sm leading-6">
            <p className="text-muted-foreground break-words">
              Bạn có chắc muốn xóa lộ trình{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{pathTitle}&rdquo;
              </span>
              ? Lộ trình sẽ bị gỡ xuất bản (nếu đang mở) và không còn xuất hiện
              trong danh mục hoặc tìm kiếm.
            </p>

            <div className="flex items-start gap-2.5 rounded-xl border border-success/25 bg-success/5 p-3 text-xs leading-5 text-foreground">
              <ShieldCheck
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-success"
              />
              <p>
                Đây là thao tác <strong>xóa mềm</strong>: toàn bộ lịch sử học
                tập, bài nộp, tiến độ, XP và huy hiệu của học viên vẫn được{" "}
                <strong>bảo toàn</strong>.
              </p>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/30 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={onClose}
            className="border-border bg-background text-foreground hover:bg-muted"
          >
            Hủy
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            {pending ? "Đang xóa..." : "Xác nhận xóa"}
          </Button>
        </div>
      </div>
    </div>
  );

  // Portal trực tiếp vào document.body để thoát khỏi stacking context của sidebar sticky / card.
  return typeof document === "undefined"
    ? dialog
    : createPortal(dialog, document.body);
}

export function DeletePathButton({
  pathId,
  pathTitle,
  redirectTo,
  initialConfirmOpen = false,
  variant = "ghost",
  label = "Xóa lộ trình",
  className,
}: {
  pathId: string;
  pathTitle: string;
  /** Nếu truyền (ví dụ từ trang chi tiết), sẽ điều hướng sau khi xóa thành công. */
  redirectTo?: string;
  /** Chỉ dùng cho trạng thái khởi tạo trong kiểm thử render hộp thoại. */
  initialConfirmOpen?: boolean;
  variant?: "ghost" | "outline" | "destructive";
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(initialConfirmOpen);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const flightRef = useRef<ReturnType<typeof createSingleFlight> | null>(null);

  function getFlight() {
    flightRef.current ??= createSingleFlight();
    return flightRef.current;
  }

  function openDialog() {
    setError("");
    setMessage("");
    setConfirmOpen(true);
  }

  function closeDialog() {
    if (pending) return;
    setConfirmOpen(false);
  }

  async function confirmDelete() {
    const flight = getFlight();
    if (flight.busy) return;
    setPending(true);
    setError("");
    setMessage("");
    let navigating = false;

    const outcome = await runDeletePath({
      flight,
      pathId,
      action: deletePathAction,
      redirectTo,
      onNavigate: (href) => {
        navigating = true;
        router.push(href);
      },
      onRefresh: () => router.refresh(),
    });

    if (!outcome.started) return;

    if (outcome.ok) {
      setMessage(outcome.message ?? "");
      if (!navigating) {
        setConfirmOpen(false);
        setPending(false);
      }
    } else {
      setError(outcome.error ?? "Chưa thể xóa lộ trình. Vui lòng thử lại.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={pending}
        aria-label={`Xóa lộ trình ${pathTitle}`}
        onClick={openDialog}
        className={cn(
          variant === "ghost" &&
            "text-destructive hover:bg-destructive/10 hover:text-destructive",
          variant === "outline" &&
            "border-destructive/40 bg-background text-destructive hover:bg-destructive/10 hover:text-destructive",
          className,
        )}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-4" aria-hidden />
        )}
        {pending ? "Đang xóa..." : label}
      </Button>

      {!confirmOpen && error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {!confirmOpen && message && (
        <p role="status" className="text-xs text-success">
          {message}
        </p>
      )}

      <DeletePathDialog
        open={confirmOpen}
        pathTitle={pathTitle}
        pending={pending}
        error={error}
        onClose={closeDialog}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
