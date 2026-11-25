import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Phần đầu trang quản lý một bài học. Bài học không có trạng thái xuất bản riêng:
 * học viên thấy bài khi lộ trình chứa nó đã được xuất bản.
 */
export function RoomHeader({
  title,
  description,
  pathPublished,
  exerciseCount,
  previewHref,
  editHref,
}: {
  title: string;
  description: string;
  pathPublished: boolean;
  exerciseCount: number;
  previewHref: string;
  editHref: string;
}) {
  return (
    <header className="space-y-4 rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Nội dung bài học
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground break-words sm:text-3xl">
            {title}
          </h1>
          {description.trim() && (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground break-words">
              {description}
            </p>
          )}
          <p className="pt-0.5 text-xs text-muted-foreground tabular-nums">
            {exerciseCount > 0 ? `${exerciseCount} bài tập` : "Chưa có bài tập"}
            {pathPublished
              ? " · Học viên đã đăng ký có thể truy cập"
              : " · Lộ trình chưa xuất bản, học viên chưa thấy bài này"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            asChild
            variant="secondary"
            size="default"
            className="rounded-xl"
          >
            <Link href={previewHref} aria-label={`Xem như học viên: ${title}`}>
              <Eye className="size-4" aria-hidden />
              Xem như học viên
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="default"
            className="rounded-xl border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
          >
            <Link href={editHref}>
              <Pencil className="size-4" aria-hidden />
              Chỉnh sửa bài học
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
