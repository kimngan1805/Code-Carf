"use client";

import { useId, useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Một dòng bài tập trong trang quản lý bài học, có nút Xem mở phần xem trước ngay bên dưới. */
export function ExerciseItem({
  summary,
  actions,
  preview,
}: {
  summary: React.ReactNode;
  actions: React.ReactNode;
  preview: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <li
      className={cn(
        "rounded-2xl border bg-background transition-colors",
        open ? "border-primary" : "border-border/70 hover:border-primary/35",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1.5">{summary}</div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={open ? "secondary" : "ghost"}
            size="sm"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg"
          >
            <Eye className="size-3.5" aria-hidden />
            Xem
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-180",
              )}
            />
          </Button>
          {actions}
        </div>
      </div>
      <div
        id={panelId}
        hidden={!open}
        className="border-t-2 border-dashed border-primary/15 p-4 sm:p-5"
      >
        {preview}
      </div>
    </li>
  );
}
