import { notFound, redirect } from "next/navigation";
import { getRoomPage } from "@/features/rooms/service";
import { RoomView } from "@/features/rooms/components/room-view";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = await getRoomPage(roomId).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 404) notFound();
      if (error.status === 401)
        redirect(
          `/login?callbackUrl=${encodeURIComponent(`/hv/rooms/${roomId}`)}`,
        );
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });
  return <RoomView room={room} />;
}
