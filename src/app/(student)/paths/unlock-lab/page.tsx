import { notFound, redirect } from "next/navigation";
import { UnlockLab } from "@/features/rooms/components/unlock-lab";
import { presentLab, requireRoomLab } from "@/features/rooms/lab";
import { AppError } from "@/lib/errors";

export default async function UnlockLabPage() {
  const user = await requireRoomLab().catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401)
        redirect("/login?callbackUrl=/paths/unlock-lab");
      if (error.status === 403) redirect("/forbidden");
      if (error.status === 404) notFound();
    }
    throw error;
  });
  return <UnlockLab initial={await presentLab(user.id)} />;
}
