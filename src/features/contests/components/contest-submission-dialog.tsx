"use client";

import { useEffect, useRef } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContestSubmissionDialog({
  open,
  completed = false,
  stage,
  timeUp = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  completed?: boolean;
  /** Cuộc thi theo hành trình: hộp thoại nói về chặng thay vì cả lượt thi. */
  stage?: number | null;
  /** Chặng kết thúc vì hết giờ chứ không phải vì đã nộp đủ bài. */
  timeUp?: boolean;
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
        {completed
          ? stage
            ? timeUp
              ? `Hết giờ chặng ${stage}`
              : `Hoàn thành chặng ${stage}!`
            : "Hoàn thành cuộc thi!"
          : "Xác nhận nộp bài?"}
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
          ? stage
            ? timeUp
              ? `Bài đang làm dở được tự nộp, các bài chưa nộp của chặng ${stage} tính 0 điểm. Bạn sẽ được chuyển về bản đồ hành trình.`
              : `Bài làm chặng ${stage} đã được ghi nhận. Bạn sẽ được chuyển về bản đồ hành trình để mở chặng tiếp theo.`
            : "Bài làm của bạn đã được ghi nhận. Bạn sẽ được chuyển về trang chi tiết cuộc thi."
          : stage
            ? `Đây là bài cuối của chặng ${stage}. Sau khi xác nhận, chặng này kết thúc và bạn không thể sửa hoặc nộp lại bài của chặng.`
            : "Đây là bài cuối cùng chưa nộp. Sau khi xác nhận, lượt thi sẽ kết thúc và bạn không thể sửa hoặc nộp lại bài."}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {!completed && (
          <Button variant="outline" onClick={onCancel}>
            Tiếp tục làm bài
          </Button>
        )}
        <Button onClick={onConfirm}>
          {completed
            ? stage
              ? "Về bản đồ hành trình"
              : "Về chi tiết cuộc thi"
            : "Xác nhận nộp bài"}
        </Button>
      </div>
    </dialog>
  );
}
