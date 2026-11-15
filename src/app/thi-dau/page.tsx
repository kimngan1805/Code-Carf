import type { Metadata } from "next";
import { connection } from "next/server";
import { getPublicShowcase } from "@/features/contest-showcase/service";
import { ContestCard } from "@/features/contest-showcase/components/contest-card";
import { ContestGallery } from "@/features/contest-showcase/components/contest-gallery";
import {
  ShowcaseGuide,
  ShowcaseIntro,
} from "@/features/contest-showcase/components/showcase-intro";

export const metadata: Metadata = {
  title: "Khám phá thi đấu · Code Carf",
  description:
    "Khám phá các cuộc thi lập trình, tìm thử thách phù hợp và sẵn sàng chinh phục cùng Code Carf.",
};
export default async function ShowcasePage() {
  await connection();
  const contests = await getPublicShowcase();
  return (
    <main>
      <ShowcaseIntro />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {contests[0] && (
          <section aria-labelledby="featured-title" className="pt-14 sm:pt-16">
            <h2
              id="featured-title"
              className="mb-5 text-xs font-bold tracking-[0.2em] text-accent-strong uppercase"
            >
              CUỘC THI NỔI BẬT
            </h2>
            <ContestCard contest={contests[0]} featured />
          </section>
        )}
        <ContestGallery contests={contests} />
        <ShowcaseGuide />
      </div>
    </main>
  );
}
