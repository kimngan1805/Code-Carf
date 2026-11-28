"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markRoomLearnedAction } from "../progress-actions";

/** Bài học chỉ có nội dung: học viên tự bấm đã học xong để mở bài tiếp theo. */
export function MarkLearned({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={pending}
        className="w-full rounded-full"
        onClick={async () => {
          setPending(true);
          setError("");
          const result = await markRoomLearnedAction(roomId);
          if (result.error) {
            setPending(false);
            setError(result.error);
            return;
          }
          // Giữ nút ở trạng thái chờ tới khi trang tải lại, tránh bấm hai lần.
          // Trang tải lại sẽ hiện "Đã hoàn thành" và nút sang bài tiếp theo.
          router.refresh();
        }}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <CheckCircle2 className="size-4" aria-hidden />
        )}
        Đã học xong
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
