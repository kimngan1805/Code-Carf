"use client";

import { useId, useState } from "react";
import { Search, Trophy } from "lucide-react";
import type { PublicContest } from "../service";
import { ContestCard } from "./contest-card";
import { filterShowcase } from "../gallery";

const filters = [
  { value: "all", label: "Tất cả" },
  { value: "upcoming", label: "Sắp diễn ra" },
  { value: "live", label: "Đang diễn ra" },
  { value: "ended", label: "Đã kết thúc" },
] as const;
export function ContestGallery({ contests }: { contests: PublicContest[] }) {
  const searchId = useId();
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const shown = filterShowcase(contests, filter, query);
  return (
    <section
      id="kham-pha"
      aria-labelledby="gallery-title"
      className="scroll-mt-24 py-14 sm:py-20"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
            SÂN CHƠI DÀNH CHO BẠN
          </p>
          <h2
            id="gallery-title"
            className="mt-3 text-3xl font-bold text-primary"
          >
            Tìm thử thách tiếp theo
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          Từ bước khởi đầu đến những vòng thi đầy thử thách. Khám phá cuộc thi
          phù hợp với bạn.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Lọc cuộc thi theo trạng thái"
          className="flex flex-wrap gap-2"
        >
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring ${filter === item.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary/50 hover:text-primary"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label htmlFor={searchId} className="relative w-full sm:w-64">
          <span className="sr-only">Tìm cuộc thi theo tên</span>
          <Search
            className="absolute top-3 left-3 size-4 text-muted-foreground"
            aria-hidden
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm cuộc thi..."
            className="h-10 w-full rounded-full border bg-background pr-4 pl-10 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
        </label>
      </div>
      <p role="status" className="mt-5 text-xs text-muted-foreground">
        {shown.length} cuộc thi
      </p>
      {shown.length ? (
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((contest) => (
            <ContestCard key={contest.slug} contest={contest} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed bg-muted/30 px-6 py-14 text-center">
          <Trophy className="mx-auto size-10 text-primary/50" aria-hidden />
          <h3 className="mt-4 text-lg font-semibold">
            {contests.length
              ? "Chưa tìm thấy cuộc thi phù hợp"
              : "Thử thách mới đang được chuẩn bị"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {contests.length
              ? "Thử đổi trạng thái hoặc tìm với một tên khác."
              : "Các cuộc thi sẽ xuất hiện tại đây khi được công bố. Bạn có thể tìm hiểu cách tham gia ngay bên dưới."}
          </p>
          {contests.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
              className="mt-5 rounded text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2"
            >
              Xem tất cả cuộc thi
            </button>
          )}
        </div>
      )}
    </section>
  );
}
