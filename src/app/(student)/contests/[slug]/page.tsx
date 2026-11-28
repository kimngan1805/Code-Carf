import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AppError } from "@/lib/errors";
import { getContest } from "@/features/contests/service";
import { parseContestDetailTab } from "@/features/contests/tab-url";
import {
  ContestDetailTabs,
  ContestOpenLeaderboardButton,
  ContestTabProvider,
} from "@/features/contests/components/contest-detail-tabs";
import {
  ContestDetailAside,
  ContestDetailHero,
  ContestDetailTabs as ShowcaseDetailTabs,
} from "@/features/contest-showcase/components/contest-detail";
import { ContestArena } from "@/features/contest-showcase/components/contest-arenas";
import { getShowcaseContest } from "@/features/contest-showcase/service";
import { Countdown } from "@/features/contests/components/countdown";
import { ParticipationAction } from "@/features/contests/components/participation-action";
import { getContestPhase, getExamPhase } from "@/features/contests/time";

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const initialTab = parseContestDetailTab(query.tab);
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
  const showcase = await getShowcaseContest(slug, now);
  const action = (
    <div className="space-y-4">
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
      {contest.canParticipate && contest.participant && (
        <ContestOpenLeaderboardButton />
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        {contest.requireFaceCheck
          ? "Yêu cầu camera khi vào thi"
          : "Không yêu cầu camera"}
      </p>
    </div>
  );
  const overviewContent = (
    <div className="space-y-10">
      <ContestArena contest={showcase} />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <ShowcaseDetailTabs contest={showcase} signedIn />
        </div>
        <div className="order-first lg:order-none">
          <ContestDetailAside contest={showcase} action={action} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <ContestDetailHero
        contest={showcase}
        back={{ href: "/contests", label: "Tất cả cuộc thi" }}
      />

      <ContestTabProvider key={slug} slug={slug} initialTab={initialTab}>
        <ContestDetailTabs
          canViewLeaderboard={
            contest.canParticipate && Boolean(contest.participant)
          }
          overview={overviewContent}
        />
      </ContestTabProvider>
    </div>
  );
}
