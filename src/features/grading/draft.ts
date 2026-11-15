import {
  isSubmissionLanguage,
  languages,
  type SubmissionLanguage,
} from "./languages";

export const DEFAULT_LANGUAGE: SubmissionLanguage = "python";

/** localStorage key for the code a learner is typing for one exercise + language. */
export function practiceDraftKey(
  userId: string,
  exerciseId: string,
  language: SubmissionLanguage,
) {
  return `code-carf:practice-draft:${userId}:${exerciseId}:${language}`;
}

/** localStorage key for the language a learner last picked on an exercise. */
export function practiceLanguageKey(userId: string, exerciseId: string) {
  return `code-carf:practice-language:${userId}:${exerciseId}`;
}

/** Falls back to the default when the stored value is missing or no longer supported. */
export function resolveLanguage(saved: unknown): SubmissionLanguage {
  return isSubmissionLanguage(saved) ? saved : DEFAULT_LANGUAGE;
}

export function starterFor(language: SubmissionLanguage): string {
  return languages.find((item) => item.id === language)!.starter;
}
