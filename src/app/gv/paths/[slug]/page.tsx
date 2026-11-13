import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedPath } from "@/features/paths/management";
import { PathUnlockSetting } from "@/features/paths/components/path-unlock-setting";
import { AppError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function ManagedPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { slug } = await params;
  const created = (await searchParams).created === "1";
  const path = await getManagedPath(slug).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href="/gv/paths"
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← Quản lý lộ trình
      </Link>
      {created && (
        <p
          role="status"
          className="rounded-xl bg-success/10 p-4 text-sm font-medium text-success"
        >
          Đã tạo lộ trình thành công.
        </p>
      )}
      <section className="space-y-4 rounded-2xl border bg-background p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-primary break-words">
          {path.title}
        </h1>
        <p className="text-muted-foreground break-words">{path.description}</p>
        <p className="text-sm text-muted-foreground">
          {path.published ? "Đã xuất bản" : "Bản nháp"} · {path.rooms.length}{" "}
          Room
        </p>
        <PathUnlockSetting
          pathId={path.id}
          initialEnabled={path.sequentialUnlock}
        />
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Nội dung lộ trình</h2>
          <Button asChild>
            <Link href={`/gv/paths/${path.slug}/rooms/new`}>
              <Plus className="size-4" aria-hidden />
              Thêm bài học
            </Link>
          </Button>
        </div>
        {!path.rooms.length && (
          <p className="text-muted-foreground">Lộ trình chưa có bài học.</p>
        )}
        <ol className="space-y-3">
          {path.rooms.map((room) => (
            <li
              key={room.id}
              className="space-y-2 rounded-xl border bg-background p-4"
            >
              <h3 className="font-semibold break-words">
                <Link
                  href={`/gv/paths/${path.slug}/rooms/${room.id}`}
                  className="text-primary hover:underline"
                >
                  {room.position}. {room.title}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground break-words">
                {room.description}
              </p>
              <p className="text-sm text-muted-foreground">
                {room._count.exercises} bài tập
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
