import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getContestWorkspace } from "@/features/contests/workspace";
import { ContestWorkspace } from "@/features/contests/components/contest-workspace";
import { AppError } from "@/lib/errors";

export default async function ContestPlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getContestWorkspace(slug).catch((error: unknown) => {
    if (error instanceof AppError) {
      if (error.status === 404) notFound();
      if (error.status === 401)
        redirect(
          `/login?callbackUrl=${encodeURIComponent(`/contests/${slug}/play`)}`,
        );
      if (error.status === 403) return { error: error.message };
    }
    throw error;
  });
  if (!("error" in entry)) return <ContestWorkspace data={entry} />;
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
