import Link from "next/link";
import { ArrowRight, CodeXml, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PathStatusBadge } from "./path-badges";

export interface ManagedPathRoomItemData {
  id: string;
  position: number;
  title: string;
  description: string;
  published: boolean;
  _count: {
    exercises: number;
  };
}

export function ManagedPathRoomItem({
  pathSlug,
  room,
}: {
  pathSlug: string;
  room: ManagedPathRoomItemData;
}) {
  const detailHref = `/gv/paths/${pathSlug}/rooms/${room.id}`;
  const previewHref = `${detailHref}/preview`;
  const hasExercises = room._count.exercises > 0;

  return (
    <li className="rounded-xl border border-border/70 bg-background px-4 py-3.5 transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Bên trái: Thứ tự + Tên + Badge trạng thái + Metadata gọn */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold text-foreground tabular-nums"
          >
            {room.position}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 text-sm font-semibold text-foreground break-words sm:text-base">
                <Link
                  href={detailHref}
                  className="rounded transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {room.title}
                </Link>
              </h3>
              <PathStatusBadge published={room.published} />
            </div>

            {room.description.trim() && (
              <p className="line-clamp-1 text-xs leading-5 text-muted-foreground break-words">
                {room.description}
              </p>
            )}

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
              {hasExercises ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                  <CodeXml className="size-3.5 text-primary/70" aria-hidden />
                  {room._count.exercises} bài tập
                </span>
              ) : (
                <span>Chưa có bài tập</span>
              )}
            </p>
          </div>
        </div>

        {/* Bên phải: Xem như học viên + Quản lý (không có nút Sửa trên card) */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="default"
            className="rounded-xl text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <Link
              href={previewHref}
              aria-label={`Xem như học viên: ${room.title}`}
            >
              <Eye className="size-4" aria-hidden />
              Xem như học viên
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="default"
            className="rounded-xl"
          >
            <Link
              href={detailHref}
              aria-label={`Quản lý bài học ${room.title}`}
            >
              Quản lý
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}
