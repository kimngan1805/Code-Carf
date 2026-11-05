"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

/** Lowercase, strip Vietnamese diacritics and punctuation so "da nang" matches "Đà Nẵng". */
export function normalizeSearch(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      // Ignore punctuation so "viet han" matches "Việt - Hàn".
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
  );
}

export function Combobox({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  emptyText = "Không có kết quả",
  disabled = false,
  footer,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  emptyText?: string;
  disabled?: boolean;
  /** Extra row under the list, e.g. "my school is not listed". */
  footer?: React.ReactNode;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = options.find((option) => option.value === value) ?? null;
  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);
    return needle
      ? options.filter((option) =>
          normalizeSearch(option.label).includes(needle),
        )
      : options;
  }, [options, query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(option: ComboboxOption) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered[active] ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          placeholder={selected ? selected.label : placeholder}
          value={open ? query : (selected?.label ?? "")}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, filtered.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (filtered[active]) choose(filtered[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="flex h-12 w-full rounded-xl border border-input bg-background pr-11 pl-11 text-sm shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ChevronDown
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </div>

      {open && !disabled && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border/80 bg-background shadow-xl">
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted-foreground">
                {emptyText}
              </li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    choose(option);
                  }}
                  onPointerEnter={() => setActive(index)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm",
                    index === active && "bg-muted",
                    option.value === value && "font-semibold text-primary",
                  )}
                >
                  {option.label}
                  {option.value === value && (
                    <Check className="size-4 shrink-0" aria-hidden />
                  )}
                </li>
              ))
            )}
          </ul>
          {footer && (
            <div
              className="border-t border-border/70 p-1"
              onPointerDown={() => setOpen(false)}
            >
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
