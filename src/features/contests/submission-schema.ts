import { z } from "zod";
import { submissionLanguages } from "@/features/grading/languages";
import { MAX_SOURCE_LENGTH } from "@/features/grading/submit";

export const contestSubmissionSchema = z.object({
  exerciseId: z.string().min(1).max(100),
  language: z.enum(submissionLanguages),
  source: z
    .string()
    .min(1)
    .max(MAX_SOURCE_LENGTH)
    .refine((value) => value.trim().length > 0),
});
