"use client";

import { useState } from "react";
import { Globe, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createLibraryCategoryAction } from "../actions";
import { STATUS_LABELS } from "../labels";

export type MetaValue = {
  categoryId: string | null;
  tags: string[];
  status: "DRAFT" | "READY" | "ARCHIVED";
  visibility: "PRIVATE" | "SHARED";
};

export type CategoryOption = { id: string; name: string };

const inputClass =
  "h-10 w-full rounded-xl border-2 border-input bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none";

/** Danh mục, thẻ, trạng thái và chia sẻ của một mục trong kho; dùng chung cho bài tập và bài giảng. */
export function MetaFields({
  value,
  onChange,
  categories: initialCategories,
}: {
  value: MetaValue;
  onChange: (value: MetaValue) => void;
  categories: CategoryOption[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [tagText, setTagText] = useState(value.tags.join(", "));
  const [error, setError] = useState("");

  async function addCategory() {
    setError("");
    const result = await createLibraryCategoryAction(newName);
    if (result.error || !result.data) {
      setError(result.error ?? "Chưa tạo được danh mục.");
      return;
    }
    const created = { id: result.data.id, name: newName.trim() };
    setCategories((all) =>
      all.some((item) => item.id === created.id)
        ? all
        : [...all, created].sort((a, b) => a.name.localeCompare(b.name, "vi")),
    );
    onChange({ ...value, categoryId: created.id });
    setAdding(false);
    setNewName("");
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label htmlFor="meta-category" className="text-sm font-semibold">
          Danh mục
        </label>
        {adding ? (
          <div className="flex gap-2">
            <input
              id="meta-category"
              autoFocus
              value={newName}
              maxLength={60}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCategory();
                }
              }}
              placeholder="Ví dụ: Python, CTDL"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addCategory}
              className="h-10 shrink-0 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              Tạo
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              id="meta-category"
              value={value.categoryId ?? ""}
              onChange={(event) =>
                onChange({ ...value, categoryId: event.target.value || null })
              }
              className={inputClass}
            >
              <option value="">Chưa phân loại</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Tạo danh mục mới"
              onClick={() => setAdding(true)}
              className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-input text-primary hover:border-primary"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="meta-tags" className="text-sm font-semibold">
          Thẻ{" "}
          <span className="font-normal text-muted-foreground">
            (phân cách bằng dấu phẩy)
          </span>
        </label>
        <input
          id="meta-tags"
          value={tagText}
          onChange={(event) => {
            setTagText(event.target.value);
            onChange({
              ...value,
              tags: event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            });
          }}
          placeholder="vòng lặp, nhập môn"
          className={inputClass}
        />
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold">Trạng thái</legend>
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {(Object.keys(STATUS_LABELS) as MetaValue["status"][]).map(
            (status) => (
              <label
                key={status}
                className={cn(
                  "flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-center text-xs font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                  value.status === status
                    ? "bg-background text-primary shadow-xs"
                    : "text-muted-foreground",
                )}
              >
                <input
                  type="radio"
                  name="meta-status"
                  className="sr-only"
                  checked={value.status === status}
                  onChange={() => onChange({ ...value, status })}
                />
                {STATUS_LABELS[status]}
              </label>
            ),
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold">Chia sẻ</legend>
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {(
            [
              ["PRIVATE", "Cá nhân", Lock],
              ["SHARED", "Giảng viên khác", Globe],
            ] as const
          ).map(([visibility, label, Icon]) => (
            <label
              key={visibility}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                value.visibility === visibility
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground",
              )}
            >
              <input
                type="radio"
                name="meta-visibility"
                className="sr-only"
                checked={value.visibility === visibility}
                onChange={() => onChange({ ...value, visibility })}
              />
              <Icon className="size-3.5" aria-hidden />
              {label}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {value.visibility === "SHARED"
            ? "Giảng viên khác thấy mục này khi ở trạng thái Sẵn sàng."
            : "Chỉ bạn thấy mục này."}
        </p>
      </fieldset>
    </div>
  );
}
