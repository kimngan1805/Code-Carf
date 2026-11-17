import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedPath } from "@/features/paths/management";
import { PathUnlockSetting } from "@/features/paths/components/path-unlock-setting";
import { AppError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PathPublication } from "@/features/paths/components/path-publication";
import {
  DIFFICULTY_LABELS,
  coverThemeClass,
} from "@/features/paths/cover-themes";

export default async function ManagedPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const created = query.created === "1";
  const saved = query.saved === "1";
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
      {saved && (
        <p
          role="status"
          className="rounded-xl bg-success/10 p-4 text-sm font-medium text-success"
        >
          Đã lưu thông tin lộ trình.
        </p>
      )}
      <section className="space-y-4 rounded-2xl border bg-background p-4 sm:p-6">
        <div
          aria-hidden
          className={`h-20 rounded-xl bg-gradient-to-br ${coverThemeClass(path.coverTheme)}`}
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-primary break-words">
            {path.title}
          </h1>
          <Button asChild variant="outline" size="sm">
            <Link href={`/gv/paths/${path.slug}/edit`}>
              Chỉnh sửa thông tin
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground break-words">{path.description}</p>
        <p className="text-sm text-muted-foreground">
          {path.published ? "Đã xuất bản" : "Bản nháp"} · {path.rooms.length}{" "}
          Room · {DIFFICULTY_LABELS[path.difficulty]}
          {path.estimatedMinutes
            ? ` · khoảng ${+(path.estimatedMinutes / 60).toFixed(1)} giờ`
            : ""}
        </p>
        {path.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Chủ đề">
            {path.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
              >
                #{tag}
              </li>
            ))}
          </ul>
        )}
        <PathUnlockSetting
          pathId={path.id}
          initialEnabled={path.sequentialUnlock}
        />
        <PathPublication pathId={path.id} published={path.published} />
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold break-words">
                  <Link
                    href={`/gv/paths/${path.slug}/rooms/${room.id}`}
                    className="text-primary hover:underline"
                  >
                    {room.position}. {room.title}
                  </Link>
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      room.published
                        ? "bg-success/15 text-success"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {room.published ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                  <Link
                    href={`/gv/paths/${path.slug}/rooms/${room.id}/preview`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Xem trước
                  </Link>
                </div>
              </div>
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
