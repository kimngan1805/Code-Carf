import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  CodeXml,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicContest } from "@/features/contest-showcase/service";
import {
  PublicDate,
  PublicPhase,
} from "@/features/contest-showcase/components/contest-card";
import { phaseLabels } from "@/features/contests/time";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Giới thiệu cuộc thi · Code Carf" };
export default async function PublicContestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const contest = await getPublicContest(slug).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/thi-dau#kham-pha"
        className="inline-flex items-center gap-2 rounded text-sm font-semibold text-primary focus-visible:outline-2"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Khám phá thi đấu
      </Link>
      <header className="mt-7 rounded-3xl border bg-gradient-to-br from-secondary/50 to-background p-6 sm:p-10">
        <PublicPhase phase={contest.phase} />
        <h1 className="mt-5 max-w-4xl text-3xl leading-tight font-bold break-words text-primary sm:text-5xl">
          {contest.title}
        </h1>
        <div className="mt-6 flex flex-wrap gap-5 text-sm">
          <span className="flex items-center gap-2">
            <Clock3 className="size-4 text-primary" aria-hidden />
            {contest.durationMinutes} phút / thí sinh
          </span>
          <span className="flex items-center gap-2">
            <CodeXml className="size-4 text-primary" aria-hidden />
            {contest.exercises} đề
          </span>
          <span className="flex items-center gap-2">
            <Users className="size-4 text-primary" aria-hidden />
            {contest.participants} lượt đăng ký
          </span>
        </div>
      </header>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section
          aria-labelledby="about-title"
          className="min-w-0 rounded-3xl border p-6 sm:p-8"
        >
          <h2 id="about-title" className="text-xl font-bold text-primary">
            Về cuộc thi
          </h2>
          <p className="mt-5 text-sm leading-8 whitespace-pre-wrap break-words text-muted-foreground">
            {contest.description ||
              "Thông tin giới thiệu đang được ban tổ chức cập nhật. Bạn có thể theo dõi lịch thi và chuẩn bị kiến thức trước khi đăng ký."}
          </p>
          <div className="mt-8 rounded-2xl bg-muted/60 p-5">
            <h3 className="font-semibold">Chuẩn bị trước khi tham gia</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
              <li>
                Đăng ký tài khoản học viên và tham gia trong thời gian mở đăng
                ký.
              </li>
              <li>Đọc kỹ thông tin cuộc thi và chuẩn bị kết nối ổn định.</li>
              <li>
                Đồng hồ riêng bắt đầu khi bạn bấm bắt đầu làm bài; lượt thi kết
                thúc chậm nhất vào giờ đóng làm bài.
              </li>
            </ul>
          </div>
        </section>
        <aside
          aria-labelledby="schedule-title"
          className="rounded-3xl border p-6 sm:p-8"
        >
          <h2
            id="schedule-title"
            className="flex items-center gap-2 text-lg font-bold text-primary"
          >
            <CalendarDays className="size-5" aria-hidden />
            Lịch cuộc thi
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Giờ Việt Nam (UTC+7)
          </p>
          <dl className="mt-6 space-y-6">
            <div>
              <dt className="text-sm font-semibold">
                Đăng ký{" "}
                <span className="ml-1 block text-xs font-normal text-muted-foreground sm:inline">
                  {phaseLabels[contest.registrationPhase]}
                </span>
              </dt>
              <dd className="mt-2 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Mở: </span>
                  <PublicDate value={contest.registrationOpensAt} />
                </p>
                <p>
                  <span className="text-muted-foreground">Đóng: </span>
                  <PublicDate value={contest.registrationClosesAt} />
                </p>
              </dd>
            </div>
            <div className="border-t pt-5">
              <dt className="text-sm font-semibold">Thời gian diễn ra</dt>
              <dd className="mt-2 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Bắt đầu: </span>
                  <PublicDate value={contest.examStartsAt} />
                </p>
                <p>
                  <span className="text-muted-foreground">Đóng làm bài: </span>
                  <PublicDate value={contest.examEndsAt} />
                </p>
              </dd>
            </div>
            <div className="border-t pt-5">
              <dt className="text-xs text-muted-foreground">
                Thời lượng mỗi thí sinh
              </dt>
              <dd className="mt-1 text-lg font-bold text-primary">
                {contest.durationMinutes} phút
              </dd>
            </div>
          </dl>
          {contest.phase !== "ended" ? (
            <>
              <Button asChild size="lg" className="mt-7 w-full rounded-full">
                <Link href={`/contests/${encodeURIComponent(contest.slug)}`}>
                  {contest.registrationPhase === "live"
                    ? "Đăng ký tham gia"
                    : "Vào khu vực thí sinh"}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                Bạn sẽ được yêu cầu đăng nhập nếu chưa có phiên đăng nhập.
              </p>
            </>
          ) : (
            <p className="mt-6 rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
              Cuộc thi đã kết thúc. Hẹn bạn ở thử thách tiếp theo!
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
