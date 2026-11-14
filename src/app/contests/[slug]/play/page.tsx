import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getContestEntry } from "@/features/contests/service";
import { AppError } from "@/lib/errors";

export default async function ContestPlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getContestEntry(slug).catch((error: unknown) => {
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
  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-background p-8 text-center">
      <h1 className="text-2xl font-bold">
        {"error" in entry ? "Chưa thể vào phòng thi" : entry.contest.title}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {"error" in entry
          ? entry.error
          : "Bạn đã vào phòng thi. Hãy chuẩn bị sẵn sàng cho các thử thách."}
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href={`/contests/${slug}`}>Về chi tiết cuộc thi</Link>
      </Button>
    </section>
  );
}
