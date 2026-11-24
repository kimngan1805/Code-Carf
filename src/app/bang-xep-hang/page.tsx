import type { Metadata } from "next";
import { BOARDS, isBoardKey } from "@/features/rankings/boards";
import {
  BoardPanel,
  BoardTabs,
  RankingsHero,
} from "@/features/rankings/components/rankings-view";

export const metadata: Metadata = {
  title: "Bảng xếp hạng · Code Carf",
  description:
    "Bảng xếp hạng riêng cho từng hình thức thi đấu: đấu tay đôi, leo hạng, đội, giải đấu, thử thách mỗi ngày và thi trong lớp.",
};

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requested = (await searchParams).bang;
  const board = BOARDS[isBoardKey(requested) ? requested : "ranked"];
  return (
    <main className="bg-gradient-to-b from-background via-secondary/10 to-background pb-20">
      <RankingsHero />
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <BoardTabs active={board.format} />
        <BoardPanel board={board} />
      </div>
    </main>
  );
}
