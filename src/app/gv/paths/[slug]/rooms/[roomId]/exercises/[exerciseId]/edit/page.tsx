import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedExercise } from "@/features/paths/management";
import { ExerciseEditor } from "@/features/exercises/components/exercise-editor";
import { AppError } from "@/lib/errors";

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ slug: string; roomId: string; exerciseId: string }>;
}) {
  const { slug, roomId, exerciseId } = await params;
  const exercise = await getManagedExercise(slug, roomId, exerciseId).catch(
    (error) => {
      if (error instanceof AppError && error.status === 404) notFound();
      throw error;
    },
  );
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        href={`/gv/paths/${exercise.room.path.slug}/rooms/${exercise.room.id}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← {exercise.room.title}
      </Link>
      <h1 className="text-2xl font-bold text-primary">Chỉnh sửa bài tập</h1>
      <ExerciseEditor
        pathSlug={exercise.room.path.slug}
        roomId={exercise.room.id}
        exercise={exercise}
      />
    </div>
  );
}
