import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getContestWorkspace } from "@/features/contests/workspace";
import { ContestWorkspace } from "@/features/contests/components/contest-workspace";
import { ExpiredContest } from "@/features/contests/components/expired-contest";
import { getExpiredContest } from "@/features/contests/deadline";
import { AppError } from "@/lib/errors";

export default async function ContestPlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getContestWorkspace(slug).catch(
    async (error: unknown) => {
      if (error instanceof AppError) {
        if (error.code === "ATTEMPT_NOT_STARTED") redirect(`/contests/${slug}`);
        if (
          [
            "CONTEST_NOT_OPEN",
            "CONTEST_FINISHED",
            "CONTEST_NOT_FOUND",
          ].includes(error.code)
        ) {
          const expired = await getExpiredContest(slug);
          if (expired) return { expired };
        }
        if (error.status === 404) notFound();
        if (error.status === 401)
          redirect(
            `/login?callbackUrl=${encodeURIComponent(`/contests/${slug}/play`)}`,
          );
        if (error.status === 403) return { error: error.message };
      }
      throw error;
    },
  );
  if ("expired" in entry && entry.expired)
    return <ExpiredContest {...entry.expired} />;
  if ("contest" in entry) return <ContestWorkspace data={entry} />;
  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-background p-8 text-center">
      <h1 className="text-2xl font-bold">Chưa thể vào phòng thi</h1>
      <p className="mt-4 text-sm text-muted-foreground">{entry.error}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href={`/contests/${slug}`}>Về chi tiết cuộc thi</Link>
      </Button>
    </section>
  );
}
