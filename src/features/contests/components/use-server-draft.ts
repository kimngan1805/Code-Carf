"use client";
import { useEffect, useMemo, useState } from "react";
import { createDraftQueue, type DraftSyncState } from "../draft-queue";

export function useServerDraft(slug: string, closed: boolean) {
  const [state, setState] = useState<DraftSyncState>("pending");
  const queue = useMemo(
    () =>
      createDraftQueue(async (snapshot) => {
        const response = await fetch(
          `/api/contests/${encodeURIComponent(slug)}/draft`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(snapshot),
          },
        );
        if (!response.ok) throw new Error("Draft not saved");
      }, setState),
    [slug],
  );
  useEffect(() => {
    queue.activate();
    return () => queue.pause();
  }, [queue]);
  useEffect(() => {
    queue.setClosed(closed);
  }, [closed, queue]);
  return { state, update: queue.update };
}
