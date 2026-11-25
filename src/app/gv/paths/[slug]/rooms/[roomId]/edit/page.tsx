import { notFound } from "next/navigation";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import { getManagedRoom } from "@/features/paths/management";
import { LessonAttachments } from "@/features/rooms/components/lesson-attachments";
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
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PathBreadcrumb
        items={[
          { label: "Quản lý lộ trình", href: "/gv/paths" },
          { label: room.path.title, href: `/gv/paths/${room.path.slug}` },
          {
            label: room.title,
            href: `/gv/paths/${room.path.slug}/rooms/${room.id}`,
          },
          { label: "Chỉnh sửa" },
        ]}
      />
      <header className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Nội dung bài học
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Chỉnh sửa bài học
        </h1>
      </header>
      <LessonEditor pathSlug={room.path.slug} room={room} />
      <LessonAttachments roomId={room.id} initial={room.attachments} />
    </div>
  );
}
