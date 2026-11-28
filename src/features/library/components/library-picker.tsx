"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  FileText,
  FileType,
  LoaderCircle,
  MonitorPlay,
  Plus,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/features/rooms/attachment-rules";
import { cn } from "@/lib/utils";
import { addLibraryItemToRoomAction, getLibraryPickerAction } from "../actions";
import type { LibraryPicker as PickerData } from "../service";

const KIND_LABEL = {
  CODE: "Code",
  QUIZ: "Trắc nghiệm",
  HANDWRITTEN: "Tự luận",
};
const LECTURE_LABEL = {
  VIDEO: "Video",
  PDF: "PDF",
  SLIDE: "Slide",
  DOC: "Word",
};
const LECTURE_ICON = {
  VIDEO: MonitorPlay,
  PDF: FileText,
  SLIDE: Presentation,
  DOC: FileType,
};

type Scope = "all" | "mine" | "shared";

/** Danh sách trong kho (của mình và được chia sẻ) để chép vào một bài học. Thêm được nhiều mục liên tiếp. */
export function LibraryPicker({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PickerData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<"exercises" | "lectures">("exercises");
  const [scope, setScope] = useState<Scope>("all");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getLibraryPickerAction().then((result) => {
      if (!active) return;
      if (result.error || !result.data) setLoadError(result.error ?? "");
      else setData(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  async function add(
    key: string,
    item: { exerciseId?: string; lectureId?: string },
  ) {
    setBusy(key);
    setError("");
    const result = await addLibraryItemToRoomAction({ roomId, ...item });
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAdded((current) => new Set(current).add(key));
    router.refresh();
  }

  if (loadError)
    return (
      <p role="alert" className="p-5 text-sm text-destructive sm:p-6">
        {loadError}
      </p>
    );
  if (!data)
    return (
      <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground sm:p-6">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Đang mở kho tài liệu...
      </p>
    );

  const needle = query.trim().toLowerCase();
  const matches = (item: {
    title: string;
    category: string | null;
    sharedBy: string | null;
  }) =>
    item.title.toLowerCase().includes(needle) &&
    (scope === "all" ||
      (scope === "mine" ? !item.sharedBy : Boolean(item.sharedBy))) &&
    (!category || item.category === category);
  const exercises = data.exercises.filter(matches);
  const lectures = data.lectures.filter(matches);
  const categories = [
    ...new Set(
      [...data.exercises, ...data.lectures]
        .filter((item) => !item.sharedBy && item.category)
        .map((item) => item.category as string),
    ),
  ].sort((a, b) => a.localeCompare(b, "vi"));
  const items = tab === "exercises" ? exercises : lectures;

  return (
    <div className="space-y-3 p-5 sm:p-6">
      <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
        {(
          [
            ["exercises", `Bài tập (${exercises.length})`],
            ["lectures", `Bài giảng (${lectures.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              tab === key
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="sr-only" htmlFor="library-picker-search">
          Tìm trong kho
        </label>
        <input
          id="library-picker-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo tên..."
          className="h-10 w-full rounded-xl border-2 border-input bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
        />
        <label className="sr-only" htmlFor="library-picker-scope">
          Nguồn
        </label>
        <select
          id="library-picker-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as Scope)}
          className="h-10 rounded-xl border-2 border-input bg-background px-2 text-sm focus-visible:border-primary focus-visible:outline-none"
        >
          <option value="all">Tất cả nguồn</option>
          <option value="mine">Của tôi</option>
          <option value="shared">Được chia sẻ</option>
        </select>
        <label className="sr-only" htmlFor="library-picker-category">
          Danh mục
        </label>
        <select
          id="library-picker-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-10 max-w-44 rounded-xl border-2 border-input bg-background px-2 text-sm focus-visible:border-primary focus-visible:outline-none"
        >
          <option value="">Mọi danh mục</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
          Không có mục phù hợp.{" "}
          <Link
            href="/gv/library"
            className="font-semibold text-primary underline"
          >
            Mở kho tài liệu
          </Link>
        </p>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {tab === "exercises"
            ? exercises.map((item) => {
                const key = `x:${item.id}`;
                return (
                  <PickerRow
                    key={key}
                    title={item.title}
                    meta={[
                      KIND_LABEL[item.kind],
                      `${item.points} XP`,
                      item.category,
                      item.sharedBy && `của ${item.sharedBy}`,
                    ]}
                    added={added.has(key)}
                    busy={busy === key}
                    disabled={busy !== null}
                    onAdd={() => add(key, { exerciseId: item.id })}
                  />
                );
              })
            : lectures.map((item) => {
                const key = `l:${item.id}`;
                const Icon = LECTURE_ICON[item.kind];
                return (
                  <PickerRow
                    key={key}
                    title={item.title}
                    icon={<Icon aria-hidden className="size-4 text-primary" />}
                    meta={[
                      LECTURE_LABEL[item.kind],
                      item.size ? formatFileSize(item.size) : null,
                      item.category,
                      item.sharedBy && `của ${item.sharedBy}`,
                    ]}
                    added={added.has(key)}
                    busy={busy === key}
                    disabled={busy !== null}
                    onAdd={() => add(key, { lectureId: item.id })}
                  />
                );
              })}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {added.size > 0
          ? `Đã thêm ${added.size} mục vào bài học. Video được chèn vào mục Video bài giảng, file vào tài liệu đính kèm.`
          : "Mỗi mục thêm vào là một bản sao, sửa trong kho không làm đổi bài học."}
      </p>
    </div>
  );
}

function PickerRow({
  title,
  meta,
  icon,
  added,
  busy,
  disabled,
  onAdd,
}: {
  title: string;
  meta: (string | null | undefined)[];
  icon?: React.ReactNode;
  added: boolean;
  busy: boolean;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/70 p-2.5 pl-3">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {meta.filter(Boolean).join(" · ")}
        </span>
      </span>
      <Button
        type="button"
        size="sm"
        variant={added ? "secondary" : "outline"}
        disabled={disabled}
        onClick={onAdd}
        aria-label={`${added ? "Thêm lần nữa" : "Thêm"}: ${title}`}
        className="h-8 shrink-0 rounded-lg"
      >
        {busy ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        ) : added ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Plus className="size-3.5" aria-hidden />
        )}
        {added ? "Đã thêm" : "Thêm"}
      </Button>
    </li>
  );
}
