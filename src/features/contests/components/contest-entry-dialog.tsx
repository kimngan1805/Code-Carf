"use client";
import { useEffect, useRef } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContestEntryDialog({
  open,
  started,
  pending,
  error,
  onEnter,
  onCancel,
}: {
  open: boolean;
  started: boolean;
  pending: boolean;
  error: string;
  onEnter: (fullscreen: boolean) => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
    return () => {
      if (element?.open) element.close();
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="contest-entry-title"
      aria-describedby="contest-entry-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md space-y-4 rounded-2xl border bg-background p-6 text-foreground shadow-xl backdrop:bg-foreground/50"
    >
      <Maximize2 aria-hidden className="size-8 text-primary" />
      <h2 id="contest-entry-title" className="text-xl font-bold">
        Vào chế độ làm bài?
      </h2>
      <p
        id="contest-entry-description"
        className="text-sm leading-6 text-muted-foreground"
      >
        Bài thi sẽ mở ở màn hình riêng, ẩn thanh điều hướng để bạn tập trung.
        Bạn có muốn chuyển sang toàn màn hình không?
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        {started
          ? "Đồng hồ của lượt thi hiện tại vẫn tiếp tục chạy."
          : "Đồng hồ chỉ bắt đầu khi bạn xác nhận vào làm bài."}{" "}
        Chuyển tab, dán code và thoát toàn màn hình có thể được ghi nhận. Thống
        kê sẽ hiển thị trong kết quả.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button disabled={pending} onClick={() => onEnter(true)}>
          {pending ? "Đang mở bài thi..." : "Vào toàn màn hình"}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => onEnter(false)}
        >
          Mở màn hình làm bài riêng
        </Button>
        <Button variant="ghost" disabled={pending} onClick={onCancel}>
          Quay lại
        </Button>
      </div>
    </dialog>
  );
}
