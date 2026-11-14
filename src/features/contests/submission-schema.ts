import { z } from "zod";

export const contestSubmissionSchema = z.object({
  exerciseId: z.string().min(1).max(100),
  language: z.enum(["typescript", "javascript", "python", "cpp"]),
  source: z
    .string()
    .min(1)
    .max(100_000)
    .refine((value) => value.trim().length > 0),
});
