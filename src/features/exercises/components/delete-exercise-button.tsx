"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteExerciseAction } from "../authoring-actions";

export function DeleteExerciseButton({
  pathSlug,
  roomId,
  exerciseId,
  title,
}: {
  pathSlug: string;
  roomId: string;
  exerciseId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (pending) return;
    if (!window.confirm(`Xóa bài tập "${title}"? Không thể hoàn tác.`)) return;
    setPending(true);
    setError("");
    try {
      const result = await deleteExerciseAction({
        pathSlug,
        roomId,
        exerciseId,
      });
      if (result.error) setError(result.error);
      else router.refresh();
    } catch {
      setError("Mất kết nối. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Xóa bài tập ${title}`}
        onClick={remove}
      >
        <Trash2 className="size-4" aria-hidden />
        Xóa
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
