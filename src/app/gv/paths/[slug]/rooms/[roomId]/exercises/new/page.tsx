import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedRoom } from "@/features/paths/management";
import { ExerciseEditor } from "@/features/exercises/components/exercise-editor";
import { AppError } from "@/lib/errors";

export default async function NewExercisePage({
  params,
}: {
  params: Promise<{ slug: string; roomId: string }>;
}) {
  const { slug, roomId } = await params;
  const room = await getManagedRoom(slug, roomId).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        href={`/gv/paths/${room.path.slug}/rooms/${room.id}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← {room.title}
      </Link>
      <h1 className="text-2xl font-bold text-primary">Thêm bài tập code</h1>
      <ExerciseEditor pathSlug={room.path.slug} roomId={room.id} />
    </div>
  );
}
