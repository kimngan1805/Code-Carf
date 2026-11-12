import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-12 w-full rounded-xl border border-input bg-background px-4 text-sm shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/15",
        className,
      )}
      {...props}
    />
  );
}
