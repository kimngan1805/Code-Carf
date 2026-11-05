import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/service";
import { isTeacherRole } from "@/features/auth/permissions";
import { Progress } from "@/components/ui/progress";
import { EnrollButton } from "@/features/paths/components/enroll-button";
import { getPath } from "@/features/paths/service";
import { AppError } from "@/lib/errors";

export default async function PathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (user && isTeacherRole(user.role.name))
    redirect(`/gv/paths/${encodeURIComponent(slug)}`);
  const path = await getPath(slug).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href="/hv/paths"
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← Tất cả lộ trình
      </Link>
      <section className="space-y-4 rounded-2xl border bg-background p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-primary break-words">
          {path.title}
        </h1>
        <p className="text-muted-foreground break-words">{path.description}</p>
        <p>{path.total} bài học</p>
        {path.enrolled ? (
          <>
            <p className="font-semibold text-primary">Đã đăng ký</p>
            <Progress
              value={path.total === 0 ? 0 : path.completed / path.total}
              label={`Tiến độ ${path.title}`}
            />
            <p className="text-sm text-muted-foreground">
              {path.completed}/{path.total} bài học hoàn thành · {path.percent}%
            </p>
          </>
        ) : (
          path.canEnroll && <EnrollButton slug={path.slug} />
        )}
      </section>
      <section aria-labelledby="room-list-title" className="space-y-4">
        <h2 id="room-list-title" className="text-xl font-semibold">
          Nội dung lộ trình
        </h2>
        {path.rooms.length === 0 && (
          <p className="text-muted-foreground">Lộ trình chưa có bài học.</p>
        )}
        <ol className="space-y-3">
          {path.rooms.map((room) => (
            <li
              key={room.id}
              className="space-y-2 rounded-xl border bg-background p-4"
            >
              <h3 className="font-semibold break-words">
                {room.accessible && path.canEnroll ? (
                  <Link
                    href={`/hv/rooms/${room.id}`}
                    className="text-primary hover:underline"
                  >
                    {room.position}. {room.title}
                  </Link>
                ) : (
                  <>
                    {room.position}. {room.title}
                  </>
                )}
              </h3>
              {room.description && (
                <p className="text-sm text-muted-foreground break-words">
                  {room.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {room.exercises} bài tập ·{" "}
                {room.completed ? "Đã hoàn thành" : "Chưa hoàn thành"}
              </p>
              {!room.accessible && (
                <p className="text-sm text-muted-foreground">
                  {path.enrolled
                    ? "Hoàn thành bài học trước để mở khóa."
                    : "Đăng ký lộ trình để mở bài học."}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
