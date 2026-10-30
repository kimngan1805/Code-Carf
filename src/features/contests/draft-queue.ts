import type { ContestDraftInput } from "./draft-schema";

export type DraftSyncState = "pending" | "saving" | "saved" | "error";

/** Serial writes prevent an older editor request from overwriting a newer snapshot. */
export function createDraftQueue(
  save: (draft: ContestDraftInput) => Promise<void>,
  notify: (state: DraftSyncState) => void,
) {
  let latest: ContestDraftInput | null = null;
  let active = false;
  let closed = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function schedule(delay = 300) {
    if (!active || closed || running || !latest) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, delay);
  }
  async function flush() {
    if (!active || closed || running || !latest) return;
    const snapshot = latest;
    latest = null;
    running = true;
    notify("saving");
    let failed = false;
    try {
      await save(snapshot);
      if (active && !closed) notify(latest ? "pending" : "saved");
    } catch {
      failed = true;
      latest ??= snapshot;
      if (active && !closed) notify("error");
    } finally {
      running = false;
      schedule(failed ? 1500 : 0);
    }
  }
  return {
    update(snapshot: ContestDraftInput) {
      latest = snapshot;
      schedule();
    },
    activate() {
      active = true;
      schedule();
    },
    pause() {
      active = false;
      clearTimeout(timer);
    },
    setClosed(value: boolean) {
      closed = value;
      if (closed) clearTimeout(timer);
      else schedule();
    },
  };
}
