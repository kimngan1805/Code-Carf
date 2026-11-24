import Link from "next/link";
import { ArrowDown, ArrowUp, Crown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CONTEST_FORMATS } from "@/features/contest-showcase/catalog";
import { formatTint } from "@/features/contest-showcase/components/contest-kinds";
import {
  BOARD_ORDER,
  SEASON,
  type Board,
  type BoardRow,
  type Entrant,
} from "../boards";

const boardHref = (format: string) => `/bang-xep-hang?bang=${format}`;

function initials(name: string, entrant: Entrant) {
  if (entrant === "class") return name.slice(0, 4);
  const words = name
    .replace(/[^\p{L}\d ]/gu, "")
    .split(" ")
    .filter(Boolean);
  if (entrant === "team")
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join("");
  return words.at(-1)?.[0] ?? "?";
}

function Avatar({
  row,
  entrant,
  size = "md",
}: {
  row: BoardRow;
  entrant: Entrant;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-bold text-(--tint)",
        entrant === "person" ? "rounded-full" : "rounded-xl",
        size === "lg"
          ? "size-16 border-2 border-(--tint) bg-background text-lg"
          : "size-10 bg-(--tint)/10 text-xs",
      )}
    >
      {initials(row.name, entrant)}
    </span>
  );
}

function Trend({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="inline-flex items-center text-muted-foreground">
        <Minus aria-hidden className="size-3.5" />
        <span className="sr-only">Giữ hạng</span>
      </span>
    );
  const up = value > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        up ? "text-success" : "text-destructive",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {Math.abs(value)}
      <span className="sr-only">{up ? " bậc tăng" : " bậc giảm"}</span>
    </span>
  );
}

export function RankingsHero() {
  return (
    <section className="border-b bg-gradient-to-br from-secondary/40 via-background to-secondary/20">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background px-3 py-1.5 text-xs font-semibold text-primary">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          {SEASON}
        </p>
        <h1 className="mt-5 text-4xl leading-[1.15] font-bold tracking-tight text-primary sm:text-5xl">
          Bảng xếp hạng
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
          Mỗi hình thức thi đấu có một bảng riêng, vì đấu tay đôi, chạy chuỗi
          mỗi ngày hay thi cả lớp đều cần một cách tính điểm khác nhau.
        </p>
      </div>
    </section>
  );
}

export function BoardTabs({ active }: { active: Board["format"] }) {
  return (
    <nav
      aria-label="Chọn bảng xếp hạng"
      className="flex gap-1 overflow-x-auto border-b [scrollbar-width:none]"
    >
      {BOARD_ORDER.map((format) => {
        const current = format === active;
        return (
          <Link
            key={format}
            href={boardHref(format)}
            scroll={false}
            aria-current={current ? "page" : undefined}
            style={formatTint(format)}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              current
                ? "border-(--tint) text-(--tint)"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span aria-hidden className="size-2 rounded-full bg-(--tint)" />
            {CONTEST_FORMATS[format].name}
          </Link>
        );
      })}
    </nav>
  );
}

const PODIUM = [
  { place: 0, order: "order-2", height: "h-28 sm:h-32" },
  { place: 1, order: "order-1", height: "h-20 sm:h-24" },
  { place: 2, order: "order-3", height: "h-14 sm:h-16" },
];

function Podium({ board }: { board: Board }) {
  return (
    <ol className="grid grid-cols-3 items-end gap-3 sm:gap-5">
      {PODIUM.map(({ place, order, height }) => {
        const row = board.rows[place];
        const first = row.rank === 1;
        return (
          <li
            key={row.rank}
            className={cn("flex min-w-0 flex-col items-center", order)}
          >
            {first && (
              <Crown aria-hidden className="mb-1 size-7 text-(--tint)" />
            )}
            <Avatar row={row} entrant={board.entrant} size="lg" />
            <p className="mt-2 w-full truncate text-center text-sm font-bold">
              {row.name}
            </p>
            <p className="w-full truncate text-center text-xs text-muted-foreground">
              {row.badge ?? row.detail}
            </p>
            <p className="mt-1 text-lg font-bold text-(--tint)">
              {row.score}
              <span className="sr-only"> {board.metric}</span>
            </p>
            <div
              className={cn(
                "mt-2 grid w-full place-items-center rounded-t-2xl text-2xl font-bold",
                first
                  ? "bg-(--tint) text-background"
                  : "bg-(--tint)/15 text-(--tint)",
                height,
              )}
            >
              <span>
                <span className="sr-only">Hạng </span>
                {row.rank}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function BoardTable({ board }: { board: Board }) {
  const who =
    board.entrant === "team"
      ? "Đội"
      : board.entrant === "class"
        ? "Lớp"
        : "Người chơi";
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-(--tint)/20">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">
          {board.title}: xếp hạng đầy đủ theo {board.metric.toLowerCase()}
        </caption>
        <thead className="bg-(--tint)/5 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-14 px-4 py-3 font-semibold">
              Hạng
            </th>
            <th scope="col" className="px-2 py-3 font-semibold">
              {who}
            </th>
            {board.columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-3 py-3 text-right font-semibold"
              >
                {column.label}
              </th>
            ))}
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              {board.metric}
            </th>
          </tr>
        </thead>
        <tbody>
          {board.rows.map((row) => (
            <tr
              key={row.rank}
              className={cn(
                "border-t transition-colors hover:bg-(--tint)/5",
                row.rank <= 3 && "bg-(--tint)/[0.03]",
              )}
            >
              <td className="px-4 py-3">
                <div className="flex flex-col items-start gap-0.5">
                  <span
                    className={cn(
                      "font-bold",
                      row.rank <= 3 ? "text-(--tint)" : "text-foreground",
                    )}
                  >
                    {row.rank}
                  </span>
                  <Trend value={row.trend} />
                </div>
              </td>
              <th scope="row" className="px-2 py-3 text-left font-normal">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar row={row} entrant={board.entrant} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      <span className="truncate">{row.name}</span>
                      {row.badge && (
                        <span className="shrink-0 rounded-md bg-(--tint)/10 px-1.5 py-0.5 text-[11px] font-semibold text-(--tint)">
                          {row.badge}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.detail}
                    </p>
                  </div>
                </div>
              </th>
              {board.columns.map((column) => (
                <td
                  key={column.key}
                  className="px-3 py-3 text-right text-muted-foreground tabular-nums"
                >
                  {row.cells[column.key]}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-bold text-(--tint) tabular-nums">
                {row.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoardAside({ board }: { board: Board }) {
  const format = CONTEST_FORMATS[board.format];
  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <div className="rounded-2xl border-2 border-(--tint) bg-background p-5 shadow-[4px_4px_0_0_var(--tint)]">
        <p className="text-xs font-bold tracking-[0.2em] text-(--tint) uppercase">
          Thứ hạng của bạn
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Đăng nhập để xem bạn đang đứng thứ mấy trên bảng{" "}
          {format.name.toLowerCase()}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link href={`/thi-dau?hinh-thuc=${board.format}#kham-pha`}>
              Tìm cuộc thi
            </Link>
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border bg-background p-5">
        <h3 className="font-bold">Cách leo bảng</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {board.rule}
        </p>
        <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
          Bảng làm mới vào đầu mỗi mùa. Mũi tên cho biết thay đổi so với tuần
          trước.
        </p>
      </div>
    </aside>
  );
}

export function BoardPanel({ board }: { board: Board }) {
  return (
    <section
      style={formatTint(board.format)}
      aria-labelledby="board-title"
      className="grid gap-8 pt-8 lg:grid-cols-[1fr_300px]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="board-title" className="text-2xl font-bold">
            {board.title}
          </h2>
          <span
            title="Dữ liệu mẫu để xem trước giao diện"
            className="rounded-full border border-dashed border-accent px-2 py-0.5 text-[11px] font-semibold text-accent-strong"
          >
            Mẫu
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{board.blurb}</p>
        <div className="mt-8 rounded-3xl bg-(--tint)/5 px-4 pt-6 sm:px-8">
          <Podium board={board} />
        </div>
        <div className="mt-6">
          <BoardTable board={board} />
        </div>
      </div>
      <BoardAside board={board} />
    </section>
  );
}
