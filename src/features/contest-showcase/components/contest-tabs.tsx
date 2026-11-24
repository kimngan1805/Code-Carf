"use client";

import { useId, useState, type ReactNode } from "react";
import { Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/** Nút đăng ký cho cuộc thi mẫu: chỉ đổi trạng thái trên giao diện, chưa gọi máy chủ. */
export function SampleRegisterButton({ open }: { open: boolean }) {
  const [registered, setRegistered] = useState(false);
  if (!open)
    return (
      <Button size="lg" className="w-full rounded-full" disabled>
        Chưa mở đăng ký
      </Button>
    );
  return (
    <Button
      size="lg"
      variant={registered ? "outline" : "default"}
      aria-pressed={registered}
      onClick={() => setRegistered((value) => !value)}
      className={cn(
        "w-full rounded-full",
        registered && "border-2 border-success text-success",
      )}
    >
      {registered ? (
        <>
          <Check aria-hidden className="size-4" /> Đã đăng ký
        </>
      ) : (
        <>
          <UserPlus aria-hidden className="size-4" /> Đăng ký tham gia
        </>
      )}
    </Button>
  );
}
