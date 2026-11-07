import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LeaderboardView } from "@/features/leaderboard/components/leaderboard-view";
import { getXpLeaderboard } from "@/features/leaderboard/service";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Bảng xếp hạng · Code Carf",
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; path?: string }>;
}) {
  const params = await searchParams;
  const period = params.period === "week" ? "week" : "all";
  const pathSlug =
    typeof params.path === "string" && params.path.trim()
      ? params.path.trim()
      : null;

  const data = await getXpLeaderboard({ period, pathSlug }).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/leaderboard");
      if (error.status === 403) redirect("/forbidden");
      if (error.status === 404) notFound();
    }
    throw error;
  });

  return <LeaderboardView data={data} />;
}
