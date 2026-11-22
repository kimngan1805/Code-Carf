import { notFound } from "next/navigation";
import { ExerciseEditor } from "@/features/exercises/components/exercise-editor";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import { getManagedExercise } from "@/features/paths/management";
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
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PathBreadcrumb
        items={[
          { label: "Quản lý lộ trình", href: "/gv/paths" },
          {
            label: "Chi tiết lộ trình",
            href: `/gv/paths/${exercise.room.path.slug}`,
          },
          {
            label: exercise.room.title,
            href: `/gv/paths/${exercise.room.path.slug}/rooms/${exercise.room.id}`,
          },
          { label: "Chỉnh sửa bài tập" },
        ]}
      />
      <header className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Bài tập thực hành
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Chỉnh sửa bài tập
        </h1>
      </header>
      <ExerciseEditor
        pathSlug={exercise.room.path.slug}
        roomId={exercise.room.id}
        exercise={exercise}
      />
    </div>
  );
}
