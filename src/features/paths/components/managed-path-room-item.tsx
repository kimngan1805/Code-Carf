import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  CodeXml,
  Eye,
  FileText,
  ListChecks,
  MonitorPlay,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddContentButton } from "@/features/rooms/components/add-content-dialog";
import type { LessonVideo } from "@/features/rooms/lesson-summary";

type ExerciseKind = "CODE" | "QUIZ" | "HANDWRITTEN";

export interface ManagedPathRoomItemData {
  id: string;
  position: number;
  title: string;
  description: string;
  /** Có nội dung, tài liệu hoặc bài tập (xem lessonHasMaterial). */
  hasMaterial: boolean;
  /** Tóm tắt phần chữ, null khi bài không có chữ. */
  contentSummary: string | null;
  videos: LessonVideo[];
  attachments: { id: string; fileName: string; contentType: string }[];
  exercises: { id: string; title: string; kind: ExerciseKind }[];
  _count: { exercises: number };
}

const EXERCISE_KINDS: Record<
  ExerciseKind,
  { label: string; icon: LucideIcon; tone: string }
> = {
  CODE: {
    label: "Bài code",
    icon: CodeXml,
    tone: "bg-secondary text-primary",
  },
  QUIZ: {
    label: "Trắc nghiệm",
    icon: ListChecks,
    tone: "bg-success/10 text-success",
  },
  HANDWRITTEN: {
    label: "Tự luận",
    icon: PenLine,
    tone: "bg-warning/10 text-warning",
  },
};

function fileExt(fileName: string) {
  return fileName.split(".").pop()?.toUpperCase() ?? "";
}

/** Một dòng nội dung trong bài: biểu tượng, loại, tên và một hành động. */
function ContentRow({
  icon: Icon,
  tone,
  kind,
  title,
  tag,
  action,
}: {
  icon: LucideIcon;
  tone: string;
  kind: string;
  title: string;
  tag?: string;
  action: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5">
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          tone,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-semibold text-muted-foreground">{kind}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
          <span className="min-w-0 break-words">{title}</span>
          {tag && (
            <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
              {tag}
            </span>
          )}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}

function RowLink({
  href,
  label,
  newTab,
}: {
  href: string;
  label: string;
  newTab?: boolean;
}) {
  return (
    <Link
      href={href}
      {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-ring"
    >
      {label}
    </Link>
  );
}

/**
 * Một bài học trên trang quản lý lộ trình: bấm tiêu đề để xổ/gọn, bên trong liệt kê
 * từng thứ đã có (nội dung chữ, video, tài liệu, bài tập) để giảng viên thấy ngay bài có gì.
 */
export function ManagedPathRoomItem({
  pathSlug,
  room,
}: {
  pathSlug: string;
  room: ManagedPathRoomItemData;
}) {
  const detailHref = `/gv/paths/${pathSlug}/rooms/${room.id}`;
  const editHref = `${detailHref}/edit`;
  const previewHref = `${detailHref}/preview`;
  const counts = [
    room.videos.length ? `${room.videos.length} video` : null,
    room.attachments.length ? `${room.attachments.length} tài liệu` : null,
    room._count.exercises
      ? `${room._count.exercises} bài tập`
      : "Chưa có bài tập",
  ].filter(Boolean);

  return (
    <li>
      <details
        open
        className="group rounded-2xl border border-border/70 bg-background transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-xs"
      >
        <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden
            className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold text-foreground tabular-nums"
          >
            {room.position}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-sm font-semibold text-foreground break-words sm:text-base">
              Bài {room.position}: {room.title}
            </h3>
            {room.description.trim() && (
              <p className="line-clamp-1 text-xs leading-5 text-muted-foreground break-words">
                {room.description}
              </p>
            )}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
              {counts.join(" · ")}
              {!room.hasMaterial && (
                <span className="font-semibold text-warning">
                  · Bài trống, chưa xuất bản được
                </span>
              )}
            </p>
          </div>
          <ChevronDown
            aria-hidden
            className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="space-y-3 border-t border-border/60 px-4 pt-3 pb-4">
          {room.hasMaterial ? (
            <ul className="space-y-2">
              {room.contentSummary && (
                <ContentRow
                  icon={BookOpen}
                  tone="bg-secondary/70 text-primary"
                  kind="Nội dung bài học"
                  title="Lý thuyết"
                  tag={room.contentSummary}
                  action={<RowLink href={editHref} label="Sửa" />}
                />
              )}
              {room.videos.map((video) => (
                <ContentRow
                  key={video.id}
                  icon={MonitorPlay}
                  tone="bg-destructive/10 text-destructive"
                  kind="Video"
                  title={video.caption || "Video YouTube"}
                  action={
                    <RowLink
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      label="Xem"
                      newTab
                    />
                  }
                />
              ))}
              {room.attachments.map((file) => (
                <ContentRow
                  key={file.id}
                  icon={FileText}
                  tone="bg-highlight/15 text-primary"
                  kind="Tài liệu bài giảng"
                  title={file.fileName}
                  tag={fileExt(file.fileName)}
                  action={
                    <RowLink
                      href={`/api/rooms/${room.id}/attachments/${file.id}`}
                      label="Mở"
                      newTab
                    />
                  }
                />
              ))}
              {room.exercises.map((exercise) => {
                const kind = EXERCISE_KINDS[exercise.kind];
                return (
                  <ContentRow
                    key={exercise.id}
                    icon={kind.icon}
                    tone={kind.tone}
                    kind={kind.label}
                    title={exercise.title}
                    action={
                      <RowLink
                        href={`${detailHref}/exercises/${exercise.id}/edit`}
                        label="Sửa"
                      />
                    }
                  />
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-warning/40 bg-warning/5 px-3.5 py-3 text-sm text-muted-foreground">
              Bài chưa có gì để học. Thêm slide/PDF, video, bài tập hoặc nội
              dung chữ.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <AddContentButton
              pathSlug={pathSlug}
              roomId={room.id}
              roomTitle={room.title}
              className="rounded-lg border border-dashed border-primary/40 px-3 py-2 text-sm hover:border-primary hover:bg-secondary/30 hover:no-underline"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
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
                size="sm"
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
        </div>
      </details>
    </li>
  );
}
