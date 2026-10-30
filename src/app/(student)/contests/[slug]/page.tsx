import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FileCode2,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { AppError } from "@/lib/errors";
import { getContest } from "@/features/contests/service";
import { Countdown } from "@/features/contests/components/countdown";
import { PhaseBadge } from "@/features/contests/components/phase-badge";
import { ParticipationAction } from "@/features/contests/components/participation-action";
import {
  formatContestDate,
  getContestPhase,
  getExamPhase,
} from "@/features/contests/time";

export default async function ContestDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const contest = await getContest(slug).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  const now = contest.serverNow;
  const phase = getContestPhase(contest, now);
  const examPhase = getExamPhase(contest, now);
  const target =
    phase === "upcoming"
      ? contest.startsAt
      : phase === "live"
        ? contest.endsAt
        : examPhase === "upcoming"
          ? contest.examStartsAt
          : examPhase === "live"
            ? contest.examEndsAt
            : null;
  const countdownLabel =
    phase === "upcoming"
      ? "MỞ ĐĂNG KÝ SAU"
      : phase === "live"
        ? "ĐÓNG ĐĂNG KÝ SAU"
        : examPhase === "upcoming"
          ? "BẮT ĐẦU THI SAU"
          : "ĐÓNG LÀM BÀI SAU";
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/contests"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary focus-visible:outline-2"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tất cả cuộc thi
      </Link>
      <header className="rounded-3xl bg-primary p-7 text-primary-foreground sm:p-9">
        <Trophy className="mb-4 size-9" aria-hidden />
        <h1 className="break-words text-3xl font-bold sm:text-4xl">
          {contest.title}
        </h1>
        <p className="mt-3 text-sm text-primary-foreground/80">
          Một thử thách mới, một bước tiến mới.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-background p-6">
            <h2 className="text-xl font-bold">Giới thiệu cuộc thi</h2>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
              {contest.description || "Chưa có mô tả cho cuộc thi này."}
            </p>
          </section>
          <section className="rounded-2xl border bg-background p-6">
            <h2 className="text-xl font-bold">Luật thi và tính điểm</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
              <li>
                Cuộc thi gồm {contest._count.exercises} bài. Đề bài được mở
                trong thời gian thi.
              </li>
              <li>
                Xếp hạng theo tổng điểm giảm dần; nếu bằng điểm, xét thời gian
                phạt tăng dần.
              </li>
              <li>
                Mỗi lần nộp sai cộng {contest.penaltyMinutes} phút phạt theo cấu
                hình cuộc thi.
              </li>
              <li>
                Mỗi thí sinh có tối đa {contest.durationMinutes} phút từ khi bấm
                Bắt đầu làm bài, và phải nộp trước giờ đóng làm bài chung. Hạn
                nộp được lưu trên máy chủ; tải lại trang không đặt lại đồng hồ.
              </li>
              <li>
                Lịch đăng ký tách biệt với thời gian làm bài. Đóng đăng ký không
                mở đề ngay nếu chưa đến giờ thi. Chỉ người đã đăng ký mới được
                bắt đầu khi giờ thi tới.
              </li>
              {contest.requireFaceCheck && (
                <li>
                  Cuộc thi yêu cầu xác minh khuôn mặt bằng camera khi vào thi.
                </li>
              )}
            </ul>
          </section>
        </div>
        <aside className="space-y-5 rounded-2xl border bg-background p-6 lg:sticky lg:top-24">
          <PhaseBadge phase={phase} />
          <dl className="space-y-5 text-sm">
            <div>
              <dt className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4" aria-hidden />
                Mở đăng ký
              </dt>
              <dd className="mt-1 font-semibold">
                {formatContestDate(contest.startsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Đóng đăng ký</dt>
              <dd className="mt-1 font-semibold">
                {formatContestDate(contest.endsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Thời lượng làm bài</dt>
              <dd className="mt-1 font-semibold">
                {contest.durationMinutes} phút / thí sinh
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bắt đầu thi</dt>
              <dd className="mt-1 font-semibold">
                {formatContestDate(contest.examStartsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Đóng làm bài</dt>
              <dd className="mt-1 font-semibold">
                {formatContestDate(contest.examEndsAt)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="flex items-center gap-2">
                <FileCode2 className="size-4 text-primary" aria-hidden />
                Số bài
              </dt>
              <dd className="font-semibold">{contest._count.exercises}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="flex items-center gap-2">
                <Users className="size-4 text-primary" aria-hidden />
                Đã đăng ký
              </dt>
              <dd className="font-semibold">{contest._count.participants}</dd>
            </div>
          </dl>
          {target && (
            <div className="rounded-xl bg-secondary/40 p-4 text-center text-primary">
              <p className="mb-2 text-xs font-semibold">{countdownLabel}</p>
              <Countdown key={now} target={+target} serverNow={now} />
            </div>
          )}
          {contest.participant?.deadlineAt && (
            <div className="rounded-xl bg-secondary/40 p-4 text-primary">
              <p className="text-xs font-semibold">HẠN NỘP BÀI CỦA BẠN</p>
              <p className="mt-2 text-sm font-semibold">
                {formatContestDate(contest.participant.deadlineAt)}
              </p>
            </div>
          )}
          <ParticipationAction
            slug={slug}
            phase={phase}
            examPhase={examPhase}
            registered={!!contest.participant}
            finished={!!contest.participant?.finishedAt}
            attemptStarted={!!contest.participant?.startedAt}
            attemptExpired={
              !!contest.participant?.deadlineAt &&
              +contest.participant.deadlineAt <= now
            }
            durationMinutes={contest.durationMinutes}
            canParticipate={contest.canParticipate}
            needsFaceCheck={
              contest.requireFaceCheck && !contest.participant?.faceVerifiedAt
            }
          />
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {contest.requireFaceCheck
              ? "Yêu cầu camera khi vào thi"
              : "Không yêu cầu camera"}
          </p>
          <p className="text-xs text-muted-foreground">
            Múi giờ Việt Nam (UTC+7)
          </p>
        </aside>
      </div>
    </div>
  );
}
