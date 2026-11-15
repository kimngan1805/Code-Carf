import { notFound, redirect } from "next/navigation";
import { getExercisePage } from "@/features/grading/exercise-page";
import { ExerciseView } from "@/features/grading/components/exercise-view";
import { AppError } from "@/lib/errors";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = await getExercisePage(id).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 404) notFound();
      if (error.status === 401)
        redirect(
          `/login?callbackUrl=${encodeURIComponent(`/hv/exercises/${id}`)}`,
        );
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });
  // Locked room: the room page already explains how to unlock it.
  if (!exercise.accessible) redirect(`/hv/rooms/${exercise.roomId}`);
  return <ExerciseView exercise={exercise} />;
}
