"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { moveExerciseAction } from "../authoring-actions";

/** Nút đưa bài tập lên hoặc xuống một bậc trong bài học. */
export function MoveExercise({
  pathSlug,
  roomId,
  exerciseId,
  title,
  first,
  last,
}: {
  pathSlug: string;
  roomId: string;
  exerciseId: string;
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
    const result = await moveExerciseAction({
      pathSlug,
      roomId,
      exerciseId,
      direction,
    });
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  const buttonClass =
    "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        disabled={pending || first}
        onClick={() => move("up")}
        aria-label={`Đưa "${title}" lên trên`}
        className={buttonClass}
      >
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        disabled={pending || last}
        onClick={() => move("down")}
        aria-label={`Đưa "${title}" xuống dưới`}
        className={buttonClass}
      >
        <ArrowDown className="size-4" aria-hidden />
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
