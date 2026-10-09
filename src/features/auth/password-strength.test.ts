import { describe, expect, it } from "vitest";
import { getPasswordStrength } from "./password-strength";

describe("getPasswordStrength", () => {
  it("is empty for no input", () =>
    expect(getPasswordStrength("").score).toBe(0));
  it("is weak below the minimum length", () =>
    expect(getPasswordStrength("Ab1!").score).toBe(1));
  it("rates a plain 8-letter password as weak", () =>
    expect(getPasswordStrength("abcdefgh").score).toBe(1));
  it("rewards mixed character types", () =>
    expect(getPasswordStrength("Abcdefg1").score).toBe(2));
  it("rates long varied passwords as strong", () =>
    expect(getPasswordStrength("Correct-Horse-42").label).toBe("Mạnh"));
});
