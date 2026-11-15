import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  practiceDraftKey,
  practiceLanguageKey,
  resolveLanguage,
  starterFor,
} from "./draft";
import { languages, submissionLanguages } from "./languages";

describe("practice drafts", () => {
  it("scopes the draft key by user, exercise and language", () => {
    const base = practiceDraftKey("u1", "e1", "python");
    expect(base).toBe("code-carf:practice-draft:u1:e1:python");
    expect(practiceDraftKey("u2", "e1", "python")).not.toBe(base);
    expect(practiceDraftKey("u1", "e2", "python")).not.toBe(base);
    expect(practiceDraftKey("u1", "e1", "cpp")).not.toBe(base);
  });

  it("keeps practice keys separate from contest drafts", () => {
    expect(practiceDraftKey("u", "e", "java")).not.toContain("contest-draft");
    expect(practiceLanguageKey("u", "e")).toBe(
      "code-carf:practice-language:u:e",
    );
  });

  it("restores a supported saved language", () => {
    expect(resolveLanguage("cpp")).toBe("cpp");
  });

  it.each([null, undefined, "", "ruby", 42])(
    "falls back to the default for %s",
    (value) => {
      expect(resolveLanguage(value)).toBe(DEFAULT_LANGUAGE);
    },
  );

  it("has non-empty starter code for every supported language", () => {
    expect(languages.map((item) => item.id)).toEqual([...submissionLanguages]);
    for (const language of submissionLanguages)
      expect(starterFor(language).trim().length).toBeGreaterThan(0);
  });
});
