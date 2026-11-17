import { notFound, redirect } from "next/navigation";
import { getManagedRoomPreview } from "@/features/paths/management";
import { RoomView } from "@/features/rooms/components/room-view";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function ManagedRoomPreviewPage({
  params,
}: {
  params: Promise<{ slug: string; roomId: string }>;
}) {
  const { slug, roomId } = await params;
  const previewRoom = await getManagedRoomPreview(slug, roomId).catch(
    (error) => {
      if (error instanceof AppError) {
        if (error.status === 404) notFound();
        if (error.status === 401)
          redirect(
            `/login?callbackUrl=${encodeURIComponent(`/gv/paths/${slug}/rooms/${roomId}/preview`)}`,
          );
        if (error.status === 403) redirect("/forbidden");
      }
      throw error;
    },
  );

  return (
    <RoomView
      room={previewRoom}
      preview={{
        backHref: `/gv/paths/${previewRoom.path.slug}/rooms/${previewRoom.id}`,
        editHref: `/gv/paths/${previewRoom.path.slug}/rooms/${previewRoom.id}/edit`,
        roomPublished: previewRoom.published,
        pathPublished: previewRoom.path.published,
      }}
    />
  );
}
