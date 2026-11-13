import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedRoom } from "@/features/paths/management";
import { AppError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";

export default async function ManagedRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; roomId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { slug, roomId } = await params;
  const saved = (await searchParams).saved === "1";
  const room = await getManagedRoom(slug, roomId).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href={`/gv/paths/${room.path.slug}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← {room.path.title}
      </Link>
      {saved && (
        <p
          role="status"
          className="rounded-xl bg-success/10 p-4 text-sm text-success"
        >
          Đã lưu bài học thành công.
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary break-words">
          {room.title}
        </h1>
        <Button asChild variant="outline">
          <Link href={`/gv/paths/${room.path.slug}/rooms/${room.id}/edit`}>
            Chỉnh sửa bài học
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground break-words">{room.description}</p>
      <section className="rounded-2xl border bg-background p-4 sm:p-6">
        <RoomMarkdown content={room.content} />
      </section>
    </div>
  );
}
