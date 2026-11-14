"use client";
import { useCallback, useSyncExternalStore } from "react";

const memoryDrafts = new Map<string, string>();
const eventName = "code-carf-draft-change";

export function useContestDraft(key: string, starter: string) {
  const subscribe = useCallback(
    (listener: () => void) => {
      const storageChange = (event: StorageEvent) => {
        if (event.key === key || event.key === null) {
          memoryDrafts.delete(key);
          listener();
        }
      };
      window.addEventListener(eventName, listener);
      window.addEventListener("storage", storageChange);
      return () => {
        window.removeEventListener(eventName, listener);
        window.removeEventListener("storage", storageChange);
      };
    },
    [key],
  );
  const getSnapshot = useCallback(() => {
    if (memoryDrafts.has(key)) return memoryDrafts.get(key)!;
    try {
      return localStorage.getItem(key) ?? starter;
    } catch {
      return starter;
    }
  }, [key, starter]);
  const source = useSyncExternalStore(subscribe, getSnapshot, () => starter);
  const setSource = useCallback(
    (value: string) => {
      memoryDrafts.set(key, value);
      let saved = true;
      try {
        localStorage.setItem(key, value);
      } catch {
        saved = false;
      }
      window.dispatchEvent(new Event(eventName));
      return saved;
    },
    [key],
  );
  return { source, setSource };
}
