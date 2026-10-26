import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRoom } from "@/features/rooms/service";
import { AppError } from "@/lib/errors";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = await getRoom(roomId).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 404) notFound();
      if (error.status === 401) redirect("/login");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href={`/paths/${room.path.slug}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← {room.path.title}
      </Link>
      <h1 className="text-2xl font-bold text-primary break-words">
        {room.title}
      </h1>
      <p className="text-muted-foreground break-words">{room.description}</p>
      <div className="rounded-2xl border bg-background p-4 sm:p-6">
        <pre className="font-sans whitespace-pre-wrap break-words">
          {room.content}
        </pre>
      </div>
    </div>
  );
}
