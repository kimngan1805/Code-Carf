import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Clock3,
  FileCode2,
  ShieldCheck,
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
  phaseLabels,
} from "@/features/contests/time";

function scheduleDate(date: Date | null) {
  if (!date) return "Chưa công bố";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

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
  const attemptExpired =
    !!contest.participant?.deadlineAt && +contest.participant.deadlineAt <= now;
  const attemptClosed = !!contest.participant?.finishedAt || attemptExpired;
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
      <h1 className="sr-only">Chi tiết cuộc thi</h1>
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
        <aside className="space-y-4 rounded-2xl border bg-background p-5 lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PhaseBadge phase={examPhase} />
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Clock3 className="size-4 text-primary" aria-hidden />
              {contest.durationMinutes} phút
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileCode2 className="size-3.5" aria-hidden />
              {contest._count.exercises} bài
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden />
              {contest._count.participants} thí sinh
            </span>
          </div>
          {attemptClosed ? (
            <p className="rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-primary">
              {contest.participant?.finishedAt
                ? "Bạn đã hoàn thành lượt thi"
                : "Lượt làm bài của bạn đã hết giờ"}
            </p>
          ) : (
            target && (
              <div className="rounded-xl bg-secondary/40 px-4 py-3 text-center text-primary">
                <p className="mb-1 text-[11px] font-semibold">
                  {contest.participant?.deadlineAt
                    ? "THỜI GIAN CÒN LẠI"
                    : countdownLabel}
                </p>
                <Countdown
                  key={now}
                  target={+(contest.participant?.deadlineAt ?? target)}
                  serverNow={now}
                />
                {contest.participant?.deadlineAt && (
                  <p className="mt-1 text-xs">
                    Hạn nộp: {scheduleDate(contest.participant.deadlineAt)}
                  </p>
                )}
              </div>
            )
          )}
          <ParticipationAction
            slug={slug}
            phase={phase}
            examPhase={examPhase}
            registered={!!contest.participant}
            finished={!!contest.participant?.finishedAt}
            attemptStarted={!!contest.participant?.startedAt}
            attemptExpired={attemptExpired}
            durationMinutes={contest.durationMinutes}
            canParticipate={contest.canParticipate}
            needsFaceCheck={
              contest.requireFaceCheck && !contest.participant?.faceVerifiedAt
            }
          />
          <dl className="space-y-2 border-t pt-4 text-xs">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Bắt đầu thi</dt>
              <dd
                className="font-medium"
                title={formatContestDate(contest.examStartsAt)}
              >
                {scheduleDate(contest.examStartsAt)}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Đóng làm bài</dt>
              <dd
                className="font-medium"
                title={formatContestDate(contest.examEndsAt)}
              >
                {scheduleDate(contest.examEndsAt)}
              </dd>
            </div>
          </dl>
          <details className="group border-t pt-3" open={phase === "live"}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
              Lịch đăng ký
              <ChevronDown
                className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="mt-3 text-xs text-muted-foreground">
              {phaseLabels[phase]}
            </p>
            <dl className="mt-2 space-y-2 text-xs">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Mở đăng ký</dt>
                <dd>{scheduleDate(contest.startsAt)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Đóng đăng ký</dt>
                <dd>{scheduleDate(contest.endsAt)}</dd>
              </div>
            </dl>
          </details>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {contest.requireFaceCheck
              ? "Yêu cầu camera khi vào thi"
              : "Không yêu cầu camera"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Giờ Việt Nam · UTC+7
          </p>
        </aside>
      </div>
    </div>
  );
}
