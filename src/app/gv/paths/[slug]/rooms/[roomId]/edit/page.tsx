import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedRoom } from "@/features/paths/management";
import { LessonEditor } from "@/features/rooms/components/lesson-editor";
import { AppError } from "@/lib/errors";

export default async function EditLessonPage({
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
      <h1 className="text-2xl font-bold text-primary">Chỉnh sửa bài học</h1>
      <LessonEditor pathSlug={room.path.slug} room={room} />
    </div>
  );
}
