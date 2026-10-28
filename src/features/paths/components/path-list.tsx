import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import type { getPaths } from "../service";

export function PathList({
  paths,
}: {
  paths: Awaited<ReturnType<typeof getPaths>>;
}) {
  if (paths.length === 0)
    return (
      <p className="mt-6 text-muted-foreground">
        Chưa có lộ trình được xuất bản.
      </p>
    );
  return (
    <ul className="mt-6 grid gap-4">
      {paths.map((path) => (
        <li
          className="min-w-0 space-y-3 rounded-2xl border bg-background p-4 sm:p-6"
          key={path.id}
        >
          <h2 className="text-lg font-semibold text-primary break-words">
            <Link
              className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              href={`/hv/paths/${path.slug}`}
            >
              {path.title}
            </Link>
          </h2>
          <p className="text-sm text-muted-foreground break-words">
            {path.description}
          </p>
          <p className="text-sm">
            {path.total} bài học ·{" "}
            {path.enrolled ? "Đã đăng ký" : "Chưa đăng ký"}
          </p>
          {path.enrolled && (
            <>
              <Progress
                value={path.total === 0 ? 0 : path.completed / path.total}
                label={`Tiến độ ${path.title}`}
              />
              <p className="text-sm text-muted-foreground">
                {path.completed}/{path.total} bài học hoàn thành ·{" "}
                {path.percent}%
              </p>
            </>
          )}
          <Link
            href={`/hv/paths/${path.slug}`}
            className="inline-block rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Xem lộ trình
          </Link>
        </li>
      ))}
    </ul>
  );
}
