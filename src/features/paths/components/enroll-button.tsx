"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { enrollAction } from "../actions";

export function EnrollButton({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const result = await enrollAction(slug);
            setError(result.error);
          })
        }
      >
        {pending ? "Đang đăng ký..." : "Đăng ký học"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
