"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createLibraryCategoryAction,
  deleteLibraryCategoryAction,
  renameLibraryCategoryAction,
} from "../actions";

type Category = { id: string; name: string; count: number; href: string };

/** Cột danh mục bên trái kho: lọc theo danh mục, thêm, đổi tên, xóa. */
export function CategorySidebar({
  categories,
  allHref,
  active,
}: {
  categories: Category[];
  allHref: string;
  active?: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [error, setError] = useState("");

  async function create() {
    setError("");
    const result = await createLibraryCategoryAction(name);
    if (result.error) return setError(result.error);
    setAdding(false);
    setName("");
    router.refresh();
  }

  async function rename(id: string) {
    setError("");
    const result = await renameLibraryCategoryAction(id, renameText);
    if (result.error) return setError(result.error);
    setRenaming(null);
    router.refresh();
  }

  async function remove(category: Category) {
    if (
      !window.confirm(
        `Xóa danh mục "${category.name}"? Các mục bên trong vẫn còn, chuyển sang "Chưa phân loại".`,
      )
    )
      return;
    const result = await deleteLibraryCategoryAction(category.id);
    if (result.error) return setError(result.error);
    if (active === category.id) router.push(allHref);
    router.refresh();
  }

  const linkClass = (current: boolean) =>
    cn(
      "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm",
      current
        ? "bg-primary font-semibold text-primary-foreground"
        : "text-foreground hover:bg-muted",
    );

  return (
    <nav aria-label="Danh mục" className="space-y-1">
      <p className="px-3 pb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        Danh mục
      </p>
      <Link
        href={allHref}
        aria-current={!active ? "page" : undefined}
        className={linkClass(!active)}
      >
        <span className="flex items-center gap-2">
          <FolderOpen className="size-4" aria-hidden />
          Tất cả
        </span>
      </Link>
      {categories.map((category) =>
        renaming === category.id ? (
          <div key={category.id} className="flex items-center gap-1 px-1">
            <input
              autoFocus
              aria-label="Tên danh mục mới"
              value={renameText}
              maxLength={60}
              onChange={(event) => setRenameText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") rename(category.id);
                if (event.key === "Escape") setRenaming(null);
              }}
              className="h-8 min-w-0 flex-1 rounded-lg border-2 border-primary px-2 text-sm focus-visible:outline-none"
            />
            <button
              type="button"
              aria-label="Lưu tên"
              onClick={() => rename(category.id)}
              className="grid size-8 place-items-center rounded-lg text-primary hover:bg-muted"
            >
              <Check className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Hủy đổi tên"
              onClick={() => setRenaming(null)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div key={category.id} className="group/category flex items-center">
            <Link
              href={category.href}
              aria-current={active === category.id ? "page" : undefined}
              className={linkClass(active === category.id)}
            >
              <span className="truncate">{category.name}</span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  active === category.id
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {category.count}
              </span>
            </Link>
            <span className="flex opacity-0 transition-opacity group-focus-within/category:opacity-100 group-hover/category:opacity-100">
              <button
                type="button"
                aria-label={`Đổi tên danh mục ${category.name}`}
                onClick={() => {
                  setRenaming(category.id);
                  setRenameText(category.name);
                }}
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Xóa danh mục ${category.name}`}
                onClick={() => remove(category)}
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </span>
          </div>
        ),
      )}
      {adding ? (
        <div className="flex items-center gap-1 px-1 pt-1">
          <input
            autoFocus
            aria-label="Tên danh mục"
            value={name}
            maxLength={60}
            placeholder="Tên danh mục"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") create();
              if (event.key === "Escape") setAdding(false);
            }}
            className="h-8 min-w-0 flex-1 rounded-lg border-2 border-primary px-2 text-sm focus-visible:outline-none"
          />
          <button
            type="button"
            aria-label="Tạo danh mục"
            onClick={create}
            className="grid size-8 place-items-center rounded-lg text-primary hover:bg-muted"
          >
            <Check className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
        >
          <Plus className="size-4" aria-hidden />
          Danh mục mới
        </button>
      )}
      {error && (
        <p role="alert" className="px-3 text-xs text-destructive">
          {error}
        </p>
      )}
    </nav>
  );
}
