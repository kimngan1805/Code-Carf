import { z } from "zod";

export const trackedEventTypes = [
  "TAB_SWITCH",
  "PASTE",
  "FULLSCREEN_EXIT",
] as const;
const common = {
  clientEventId: z.uuid(),
  occurredAt: z.iso.datetime(),
};
export const proctoringEventSchema = z.discriminatedUnion("type", [
  z.object({ ...common, type: z.literal("TAB_SWITCH") }).strict(),
  z.object({ ...common, type: z.literal("FULLSCREEN_EXIT") }).strict(),
  z
    .object({
      ...common,
      type: z.literal("PASTE"),
      pasteLength: z.number().int().min(0).max(2_000_000),
    })
    .strict(),
]);
export type ProctoringEventInput = z.infer<typeof proctoringEventSchema>;

export const EVENT_RATE_LIMIT = 30;
export const EVENT_RATE_WINDOW_MS = 60_000;
