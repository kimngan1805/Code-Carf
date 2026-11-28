"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteLessonAction, moveLessonAction } from "../authoring-actions";

const iconButton =
  "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-ring";

/** Nút đưa bài học lên/xuống một bậc trong lộ trình. */
export function MoveLesson({
  pathSlug,
  roomId,
  title,
  first,
  last,
}: {
  pathSlug: string;
  roomId: string;
  title: string;
  first: boolean;
  last: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function move(direction: "up" | "down") {
    setPending(true);
    setError("");
    const result = await moveLessonAction({ pathSlug, roomId, direction });
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        disabled={pending || first}
        onClick={() => move("up")}
        aria-label={`Đưa bài "${title}" lên trên`}
        className={iconButton}
      >
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        disabled={pending || last}
        onClick={() => move("down")}
        aria-label={`Đưa bài "${title}" xuống dưới`}
        className={iconButton}
      >
        <ArrowDown className="size-4" aria-hidden />
      </button>
      {error && (
        <span role="alert" className="ml-2 text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}

/**
 * Xóa bài học, hỏi lại trước khi xóa. Máy chủ từ chối nếu bài đã có học viên học
 * hay nộp bài, hoặc là bài cuối của lộ trình đang xuất bản; khi đó hiện lý do.
 */
export function DeleteLesson({
  pathSlug,
  roomId,
  title,
  redirectTo,
  className,
}: {
  pathSlug: string;
  roomId: string;
  title: string;
  /** Trang cần chuyển tới sau khi xóa (khi đang đứng ở chính bài học đó). */
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setPending(true);
    setError("");
    const result = await deleteLessonAction({ pathSlug, roomId });
    if (result.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  if (!confirming)
    return (
      <span className={cn("inline-flex flex-col items-end gap-1", className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
          aria-label={`Xóa bài học ${title}`}
          className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          Xóa bài
        </Button>
      </span>
    );

  return (
    <div
      role="alertdialog"
      aria-label={`Xác nhận xóa bài ${title}`}
      className={cn(
        "w-full space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm",
        className,
      )}
    >
      <p>
        Xóa bài <span className="font-semibold">&ldquo;{title}&rdquo;</span>{" "}
        cùng bài tập và tài liệu của bài? Thao tác này không hoàn tác được. Bài
        đã có học viên học hoặc nộp bài sẽ không xóa được.
      </p>
      {error && (
        <p role="alert" className="font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Giữ lại
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={remove}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="size-4" aria-hidden />
          )}
          {pending ? "Đang xóa..." : "Xóa bài học"}
        </Button>
      </div>
    </div>
  );
}
