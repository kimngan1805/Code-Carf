"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type RegistrationFilterOption = {
  key: string;
  label: string;
  href: string;
};

/** Dropdown lọc cuộc thi theo trạng thái đăng ký của người đang đăng nhập. */
export function RegistrationFilter({
  options,
  active,
}: {
  options: RegistrationFilterOption[];
  active: string;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.key === active);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-full items-center gap-2 whitespace-nowrap rounded-xl border bg-background px-3 py-2.5 text-sm font-semibold focus-visible:outline-2",
          active === "all" ? "text-muted-foreground" : "text-primary",
        )}
      >
        <Filter className="size-4" aria-hidden />
        <span className="sr-only">Lọc theo đăng ký: </span>
        {active === "all" ? "Đăng ký" : current?.label}
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          id={menuId}
          aria-label="Lọc theo đăng ký"
          className="absolute right-0 z-20 mt-2 min-w-44 rounded-xl border bg-background p-1 shadow-lg sm:left-0 sm:right-auto"
        >
          {options.map((option) => (
            <li key={option.key}>
              <Link
                href={option.href}
                aria-current={option.key === active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2",
                  option.key === active && "font-semibold text-primary",
                )}
              >
                {option.label}
                {option.key === active && (
                  <Check className="size-4" aria-hidden />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
