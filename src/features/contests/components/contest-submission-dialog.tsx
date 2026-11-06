"use client";

import { useEffect, useRef } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContestSubmissionDialog({
  open,
  completed = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  completed?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
    return () => {
      if (element.open) element.close();
    };
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={
        completed ? "contest-complete-title" : "contest-confirm-title"
      }
      aria-describedby={
        completed
          ? "contest-complete-description"
          : "contest-confirm-description"
      }
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border bg-background p-6 text-foreground shadow-xl backdrop:bg-foreground/50"
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        {completed ? (
          <Check aria-hidden className="size-6" />
        ) : (
          <Send aria-hidden className="size-6" />
        )}
      </div>
      <h2
        id={completed ? "contest-complete-title" : "contest-confirm-title"}
        className="text-xl font-bold"
      >
        {completed ? "Hoàn thành cuộc thi!" : "Xác nhận nộp bài?"}
      </h2>
      <p
        id={
          completed
            ? "contest-complete-description"
            : "contest-confirm-description"
        }
        className="mt-3 text-sm leading-6 text-muted-foreground"
      >
        {completed
          ? "Bài làm của bạn đã được ghi nhận. Bạn sẽ được chuyển về trang chi tiết cuộc thi."
          : "Đây là bài cuối cùng chưa nộp. Sau khi xác nhận, lượt thi sẽ kết thúc và bạn không thể sửa hoặc nộp lại bài."}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {!completed && (
          <Button variant="outline" onClick={onCancel}>
            Tiếp tục làm bài
          </Button>
        )}
        <Button onClick={onConfirm}>
          {completed ? "Về chi tiết cuộc thi" : "Xác nhận nộp bài"}
        </Button>
      </div>
    </dialog>
  );
}
