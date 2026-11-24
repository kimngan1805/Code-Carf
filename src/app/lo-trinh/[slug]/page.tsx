import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  LessonStructure,
  PathAuthor,
  PathDetailHero,
  PathOutcomes,
  PathSummaryCard,
  PathSyllabus,
} from "@/features/paths/components/path-detail";
import { getPublicPath } from "@/features/paths/service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = await getPublicPath((await params).slug);
  return path
    ? { title: `${path.title} · Code Carf`, description: path.description }
    : { title: "Không tìm thấy lộ trình · Code Carf" };
}

export default async function PublicPathPage({ params }: Props) {
  const path = await getPublicPath((await params).slug);
  if (!path) notFound();
  return (
    <main>
      <PathDetailHero path={path} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-14">
          <PathOutcomes path={path} />
          <LessonStructure />
          <PathSyllabus path={path} />
          <PathAuthor path={path} />
        </div>
        <div className="order-first lg:order-none">
          <PathSummaryCard path={path} />
        </div>
      </div>
    </main>
  );
}
