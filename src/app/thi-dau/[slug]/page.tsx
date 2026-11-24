import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getShowcaseContest } from "@/features/contest-showcase/service";
import {
  ContestDetailAside,
  ContestDetailHero,
  ContestDetailTabs,
} from "@/features/contest-showcase/components/contest-detail";
import { ContestArena } from "@/features/contest-showcase/components/contest-arenas";
import { AppError } from "@/lib/errors";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return getShowcaseContest(slug).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const contest = await load((await params).slug);
  return { title: `${contest.title} · Code Carf` };
}

export default async function PublicContestPage({ params }: Props) {
  await connection();
  const contest = await load((await params).slug);
  return (
    <main className="bg-gradient-to-b from-secondary/40 via-secondary/10 to-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <ContestDetailHero contest={contest} />
        <div className="mt-10">
          <ContestArena contest={contest} />
        </div>
        <div className="mt-10 grid gap-8 pb-10 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0">
            <ContestDetailTabs contest={contest} />
          </div>
          <div className="order-first lg:order-none">
            <ContestDetailAside contest={contest} />
          </div>
        </div>
      </div>
    </main>
  );
}
