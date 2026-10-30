import { z } from "zod";
import { submissionLanguages } from "@/features/grading/languages";
import { MAX_SOURCE_LENGTH } from "@/features/grading/submit";

export const contestDraftSchema = z.object({
  exerciseId: z.string().min(1).max(100).nullable(),
  source: z.string().max(MAX_SOURCE_LENGTH),
  language: z.enum(submissionLanguages),
});

export type ContestDraftInput = z.infer<typeof contestDraftSchema>;
