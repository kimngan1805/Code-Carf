import { notFound, redirect } from "next/navigation";
import { ViolationDashboard } from "@/features/proctoring/components/violation-dashboard";
import { getContestViolationDashboard } from "@/features/proctoring/dashboard";
import {
  buildViolationDashboardUrl,
  type RawViolationDashboardSearchParams,
} from "@/features/proctoring/dashboard-helpers";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function ContestViolationDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawViolationDashboardSearchParams>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const data = await getContestViolationDashboard(slug, query).catch(
    (error) => {
      if (error instanceof AppError) {
        if (error.status === 404) notFound();
        if (error.status === 401)
          redirect(
            `/login?callbackUrl=${encodeURIComponent(`/gv/contests/${slug}`)}`,
          );
        if (error.status === 403) redirect("/forbidden");
      }
      throw error;
    },
  );

  const rawParticipant = Array.isArray(query.participant)
    ? query.participant[0]
    : query.participant;
  const hasParticipantParam =
    typeof rawParticipant === "string" && rawParticipant.trim().length > 0;

  // On initial visit without an explicit participant or cursor param, focus the
  // highest-priority flagged participant first so investigation starts immediately.
  if (!hasParticipantParam && !data.filters.cursor) {
    const firstFlagged = data.participants.find((item) => item.flagged);
    if (firstFlagged) {
      redirect(
        buildViolationDashboardUrl(slug, {
          flaggedOnly: data.filters.flaggedOnly,
          eventType: data.filters.eventType,
          participantId: firstFlagged.userId,
          search: data.filters.search,
          cursor: null,
        }),
      );
    }
  }

  return <ViolationDashboard key={data.filters.search} data={data} />;
}
