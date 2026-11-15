import Link from "next/link";
import { BookOpen, Clock, MapPin, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { coverThemeClass, DIFFICULTY_LABELS } from "../cover-themes";
import { formatDuration, formatPostedAt } from "../format";
import type { getPaths } from "../service";
import { EnrollButton } from "./enroll-button";

type PathCard = Awaited<ReturnType<typeof getPaths>>[number];

export function PathList({
  paths,
  filtered = false,
  canEnroll = true,
}: {
  paths: PathCard[];
  filtered?: boolean;
  canEnroll?: boolean;
}) {
  if (paths.length === 0)
    return (
      <p className="mt-6 text-muted-foreground">
        {filtered
          ? "Không có lộ trình nào phù hợp với bộ lọc."
          : "Chưa có lộ trình được xuất bản."}
      </p>
    );
  return (
    <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {paths.map((path) => (
        <PathCardItem key={path.id} path={path} canEnroll={canEnroll} />
      ))}
    </ul>
  );
}

function PathCardItem({
  path,
  canEnroll,
}: {
  path: PathCard;
  canEnroll: boolean;
}) {
  const duration = formatDuration(path.estimatedMinutes);
  const posted = formatPostedAt(path.publishedAt);
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-background">
      <div
        aria-hidden
        className={cn(
          "relative h-24 bg-gradient-to-br",
          coverThemeClass(path.coverTheme),
        )}
      >
        <span className="absolute top-3 right-3 rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-primary">
          {DIFFICULTY_LABELS[path.difficulty]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-primary break-words">
          <Link
            className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            href={`/hv/paths/${path.slug}`}
          >
            {path.title}
          </Link>
        </h2>
        <p className="line-clamp-2 text-sm text-muted-foreground break-words">
          {path.description}
        </p>
        {path.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Chủ đề">
            {path.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
              >
                #{tag}
              </li>
            ))}
          </ul>
        )}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1">
            <BookOpen aria-hidden className="size-4 text-muted-foreground" />
            {path.total} bài học · {path.exercises} bài tập
          </span>
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-4 text-muted-foreground" />
              {duration}
            </span>
          )}
        </p>
        <div className="space-y-1 border-t pt-3 text-sm">
          <p className="font-semibold break-words">{path.author.name}</p>
          {path.author.school && (
            <p className="inline-flex items-start gap-1 text-muted-foreground">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span className="break-words">
                {path.author.school.name}, {path.author.school.province}
              </span>
            </p>
          )}
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            {posted && <span>Đăng {posted.toLowerCase()}</span>}
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden className="size-3.5" />
              {path.learners > 0
                ? `${path.learners} học viên`
                : "Chưa có học viên"}
            </span>
          </p>
        </div>
        <div className="mt-auto space-y-3 pt-2">
          {path.enrolled && (
            <>
              <Progress
                value={path.total === 0 ? 0 : path.completed / path.total}
                label={`Tiến độ ${path.title}`}
              />
              <p className="text-xs text-muted-foreground">
                {path.completed}/{path.total} bài học hoàn thành ·{" "}
                {path.percent}%
              </p>
            </>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {canEnroll && !path.enrolled && (
              <EnrollButton slug={path.slug} label="+ Thêm vào của tôi" />
            )}
            <Link
              href={`/hv/paths/${path.slug}`}
              className="rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {path.enrolled ? "Tiếp tục học" : "Xem chi tiết"}
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
