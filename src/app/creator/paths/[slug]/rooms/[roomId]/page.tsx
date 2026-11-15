import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedRoom } from "@/features/paths/management";
import { AppError } from "@/lib/errors";

export default async function ManagedRoomPage({
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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href={`/creator/paths/${room.path.slug}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← {room.path.title}
      </Link>
      <h1 className="text-2xl font-bold text-primary break-words">
        {room.title}
      </h1>
      <p className="text-muted-foreground break-words">{room.description}</p>
      <section className="rounded-2xl border bg-background p-4 sm:p-6">
        <pre className="font-sans whitespace-pre-wrap break-words">
          {room.content}
        </pre>
      </section>
    </div>
  );
}
