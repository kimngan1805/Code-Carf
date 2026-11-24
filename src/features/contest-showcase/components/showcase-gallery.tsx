"use client";

import { useId, useState, type CSSProperties } from "react";
import { ChevronDown, Search, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTEST_FORMATS,
  type ContestFormatKey,
  type ShowcaseContest,
} from "../catalog";
import { filterShowcase } from "../gallery";
import { formatTint, ShowcaseContestCard } from "./contest-kinds";

function Grid({ contests }: { contests: ShowcaseContest[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contests.map((contest) => (
        <ShowcaseContestCard key={contest.slug} contest={contest} />
      ))}
    </div>
  );
}

function Group({
  title,
  live = false,
  contests,
}: {
  title: string;
  live?: boolean;
  contests: ShowcaseContest[];
}) {
  if (contests.length === 0) return null;
  return (
    <section className="mt-10">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
        {live && (
          <span aria-hidden className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
        )}
        {title}
        <span className="text-sm font-normal text-muted-foreground">
          {contests.length}
        </span>
      </h3>
      <Grid contests={contests} />
    </section>
  );
}

/** Danh sách cuộc thi: một thanh hình thức, rồi chia nhóm theo trạng thái. */
export function ShowcaseGallery({
  contests,
  initialFormat,
}: {
  contests: ShowcaseContest[];
  initialFormat?: ContestFormatKey;
}) {
  const searchId = useId();
  const [format, setFormat] = useState<ContestFormatKey | "all">(
    initialFormat ?? "all",
  );
  const [query, setQuery] = useState("");
  const shown = filterShowcase(contests, "all", query).filter(
    (contest) => format === "all" || contest.profile.format === format,
  );
  const tabs = [
    { key: "all" as const, label: "Tất cả", count: contests.length },
    ...(Object.keys(CONTEST_FORMATS) as ContestFormatKey[])
      .map((key) => ({
        key,
        label: CONTEST_FORMATS[key].name,
        count: contests.filter((contest) => contest.profile.format === key)
          .length,
      }))
      .filter((tab) => tab.count > 0),
  ];
  const live = shown.filter((contest) => contest.phase === "live");
  const upcoming = shown.filter(
    (contest) =>
      contest.phase === "upcoming" || contest.phase === "unscheduled",
  );
  const ended = shown.filter((contest) => contest.phase === "ended");

  return (
    <section
      id="kham-pha"
      aria-labelledby="gallery-title"
      className="scroll-mt-24 pt-12 sm:pt-16"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="gallery-title" className="text-3xl font-bold">
          Các cuộc thi
        </h2>
        <label htmlFor={searchId} className="relative w-full sm:w-72">
          <span className="sr-only">Tìm cuộc thi theo tên</span>
          <Search
            aria-hidden
            className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm cuộc thi..."
            className="h-11 w-full rounded-full border-2 border-primary/20 bg-background pr-4 pl-10 text-sm outline-none focus-visible:border-primary"
          />
        </label>
      </div>

      <div
        role="group"
        aria-label="Lọc theo hình thức thi đấu"
        className="mt-6 flex gap-1 overflow-x-auto border-b [scrollbar-width:none]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={format === tab.key}
            onClick={() => setFormat(tab.key)}
            style={
              tab.key === "all"
                ? ({ "--tint": "var(--primary)" } as CSSProperties)
                : formatTint(tab.key)
            }
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              "inline-flex items-center gap-2",
              format === tab.key
                ? "border-(--tint) text-(--tint)"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.key !== "all" && (
              <span aria-hidden className="size-2 rounded-full bg-(--tint)" />
            )}
            {tab.label}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-primary/30 px-6 py-14 text-center">
          <Trophy className="mx-auto size-10 text-primary/50" aria-hidden />
          <p className="mt-4 font-semibold">
            {contests.length
              ? "Chưa tìm thấy cuộc thi phù hợp"
              : "Thử thách mới đang được chuẩn bị"}
          </p>
          {contests.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFormat("all");
                setQuery("");
              }}
              className="mt-4 rounded text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2"
            >
              Xem tất cả cuộc thi
            </button>
          )}
        </div>
      ) : (
        <>
          <Group title="Đang diễn ra" live contests={live} />
          <Group title="Sắp diễn ra" contests={upcoming} />
          {ended.length > 0 && (
            <details className="group/ended mt-10">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-bold text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                Đã kết thúc
                <span className="text-sm font-normal">{ended.length}</span>
                <ChevronDown
                  aria-hidden
                  className="size-4 transition-transform group-open/ended:rotate-180"
                />
              </summary>
              <div className="mt-4 opacity-80">
                <Grid contests={ended} />
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
