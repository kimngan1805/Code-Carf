"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tab đơn giản: nội dung từng tab được render sẵn ở server, client chỉ đổi tab đang mở. */
export function ContestTabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
}) {
  const baseId = useId();
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div
        role="tablist"
        aria-label="Thông tin cuộc thi"
        className="flex gap-1 overflow-x-auto rounded-full border-2 border-primary bg-background p-1 text-sm [scrollbar-width:none]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${baseId}-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${baseId}-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              active === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-${tab.id}-tab`}
          hidden={active !== tab.id}
          className="mt-6"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
