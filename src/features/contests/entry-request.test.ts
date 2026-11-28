import { afterEach, expect, it, vi } from "vitest";
import { CONTEST_ENTRY_REQUEST, requestContestEntry } from "./entry-request";

afterEach(() => vi.unstubAllGlobals());

it("reports the request as handled only when the entry panel opens its dialog", () => {
  const target = new EventTarget();
  vi.stubGlobal("window", target);
  expect(requestContestEntry()).toBe(false);

  const open = vi.fn((event: Event) => event.preventDefault());
  target.addEventListener(CONTEST_ENTRY_REQUEST, open);
  expect(requestContestEntry()).toBe(true);
  expect(open).toHaveBeenCalledOnce();
});
