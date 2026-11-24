import type { Metadata } from "next";
import { connection } from "next/server";
import { getShowcaseContests } from "@/features/contest-showcase/service";
import {
  CONTEST_FORMATS,
  type ContestFormatKey,
} from "@/features/contest-showcase/catalog";
import { ShowcaseHero } from "@/features/contest-showcase/components/contest-kinds";
import { ShowcaseGallery } from "@/features/contest-showcase/components/showcase-gallery";
import { ShowcaseGuide } from "@/features/contest-showcase/components/showcase-intro";

export const metadata: Metadata = {
  title: "Khám phá thi đấu · Code Carf",
  description:
    "Khám phá các cuộc thi lập trình, tìm thử thách phù hợp và sẵn sàng chinh phục cùng Code Carf.",
};

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const format = (await searchParams)["hinh-thuc"];
  const initialFormat =
    typeof format === "string" && format in CONTEST_FORMATS
      ? (format as ContestFormatKey)
      : undefined;
  const contests = await getShowcaseContests();
  const open = contests.filter((contest) => contest.phase !== "ended");
  const featured = open.find((contest) => contest.profile.journey) ?? open[0];
  return (
    <main className="bg-gradient-to-b from-background via-secondary/10 to-background">
      <ShowcaseHero featured={featured} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ShowcaseGallery
          key={initialFormat ?? "all"}
          contests={contests}
          initialFormat={initialFormat}
        />
        <ShowcaseGuide />
      </div>
    </main>
  );
}
