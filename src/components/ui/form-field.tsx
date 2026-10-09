import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

/** Label + input + error message, wired up with ids for screen readers. */
export function FormField({
  label,
  error,
  id,
  icon: Icon,
  trailing,
  footer,
  className,
  ...props
}: React.ComponentProps<"input"> & {
  label: string;
  id: string;
  error?: string;
  icon?: LucideIcon;
  /** Element shown inside the input on the right, e.g. a show-password button. */
  trailing?: React.ReactNode;
  /** Extra content under the input, e.g. a strength meter. */
  footer?: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground"
          />
        )}
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(Icon && "pl-11", trailing && "pr-12", className)}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {footer}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
