"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Download,
  Globe,
  LoaderCircle,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteLibraryExerciseAction,
  deleteLibraryLectureAction,
  saveSharedToMineAction,
  updateLibraryMetaAction,
} from "../actions";
import { MetaFields, type CategoryOption, type MetaValue } from "./meta-fields";
import { Modal } from "./modal";

const menuItem =
  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50";

/** Menu "…" của một mục trong kho của mình: lưu trữ, chia sẻ, sửa thông tin, xóa. */
export function ItemActions({
  target,
  id,
  name,
  meta,
  categories,
}: {
  target: "exercise" | "lecture";
  id: string;
  name: string;
  meta: MetaValue;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const wrapper = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function save(next: MetaValue, title?: string) {
    setPending(true);
    setError("");
    const result = await updateLibraryMetaAction({
      target,
      id,
      meta: next,
      ...(title ? { title } : {}),
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    setOpen(false);
    router.refresh();
    return true;
  }

  async function remove() {
    setPending(true);
    setError("");
    const result =
      target === "exercise"
        ? await deleteLibraryExerciseAction(id)
        : await deleteLibraryLectureAction(id);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setConfirmDelete(false);
    router.refresh();
  }

  const archived = meta.status === "ARCHIVED";
  const shared = meta.visibility === "SHARED";

  return (
    <div ref={wrapper} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Thao tác khác cho ${name}`}
        onClick={() => setOpen((value) => !value)}
        className="size-9 rounded-lg p-0 text-muted-foreground"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <MoreHorizontal className="size-4" aria-hidden />
        )}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 w-56 rounded-2xl border bg-background p-1.5 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
          >
            <Pencil className="size-4 text-primary" aria-hidden />
            {target === "lecture" ? "Sửa thông tin" : "Phân loại và chia sẻ"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={pending}
            onClick={() =>
              save({ ...meta, visibility: shared ? "PRIVATE" : "SHARED" })
            }
          >
            {shared ? (
              <Lock className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <Globe className="size-4 text-primary" aria-hidden />
            )}
            {shared ? "Ngừng chia sẻ" : "Chia sẻ cho giảng viên khác"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={pending}
            onClick={() =>
              save({ ...meta, status: archived ? "READY" : "ARCHIVED" })
            }
          >
            {archived ? (
              <ArchiveRestore className="size-4 text-primary" aria-hidden />
            ) : (
              <Archive className="size-4 text-muted-foreground" aria-hidden />
            )}
            {archived ? "Khôi phục khỏi lưu trữ" : "Cất vào lưu trữ"}
          </button>
          <div role="separator" className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className={`${menuItem} text-destructive hover:bg-destructive/10`}
            onClick={() => {
              setOpen(false);
              setConfirmDelete(true);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Xóa khỏi kho
          </button>
        </div>
      )}
      {error && !editing && !confirmDelete && (
        <p
          role="alert"
          className="absolute top-full right-0 mt-1 w-56 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      {editing && (
        <EditDialog
          target={target}
          name={name}
          meta={meta}
          categories={categories}
          error={error}
          pending={pending}
          onClose={() => setEditing(false)}
          onSave={async (next, title) => {
            if (await save(next, title)) setEditing(false);
          }}
        />
      )}

      {confirmDelete && (
        <Modal
          title="Xóa khỏi kho?"
          subtitle={name}
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={remove}
              >
                {pending && (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                )}
                Xóa
              </Button>
            </>
          }
        >
          <div className="space-y-2 p-5 text-sm sm:p-6">
            <p>
              Mục này sẽ bị xóa hẳn khỏi kho. Các bài học đã dùng nó vẫn giữ bản
              của mình.
            </p>
            <p className="text-muted-foreground">
              Chỉ muốn ẩn đi? Hãy chọn &quot;Cất vào lưu trữ&quot; thay vì xóa.
            </p>
            {error && (
              <p role="alert" className="font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function EditDialog({
  target,
  name,
  meta,
  categories,
  error,
  pending,
  onClose,
  onSave,
}: {
  target: "exercise" | "lecture";
  name: string;
  meta: MetaValue;
  categories: CategoryOption[];
  error: string;
  pending: boolean;
  onClose: () => void;
  onSave: (meta: MetaValue, title?: string) => void;
}) {
  const [value, setValue] = useState(meta);
  const [title, setTitle] = useState(name);
  return (
    <Modal
      title={target === "lecture" ? "Sửa bài giảng" : "Phân loại và chia sẻ"}
      subtitle={target === "exercise" ? name : undefined}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={pending || (target === "lecture" && !title.trim())}
            onClick={() =>
              onSave(value, target === "lecture" ? title.trim() : undefined)
            }
          >
            {pending && (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            )}
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-5 sm:p-6">
        {target === "lecture" && (
          <div className="space-y-1.5">
            <label htmlFor="lecture-title" className="text-sm font-semibold">
              Tên bài giảng
            </label>
            <input
              id="lecture-title"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              className="h-10 w-full rounded-xl border-2 border-input bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
            />
          </div>
        )}
        <MetaFields value={value} onChange={setValue} categories={categories} />
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

/** Với mục giảng viên khác chia sẻ: chép một bản về kho của mình để chỉnh sửa. */
export function SaveToMine({
  exerciseId,
  lectureId,
}: {
  exerciseId?: string;
  lectureId?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState("");
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={state === "done" ? "secondary" : "outline"}
        disabled={state !== "idle"}
        onClick={async () => {
          setState("pending");
          setError("");
          const result = await saveSharedToMineAction({
            exerciseId,
            lectureId,
          });
          if (result.error) {
            setError(result.error);
            setState("idle");
            return;
          }
          setState("done");
          router.refresh();
        }}
        className="rounded-lg"
      >
        {state === "pending" ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Download className="size-3.5" aria-hidden />
        )}
        {state === "done" ? "Đã lưu (bản nháp)" : "Lưu về kho của tôi"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
