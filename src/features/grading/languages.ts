/**
 * Languages students can submit in, mapped to Judge0 language ids.
 * Keys match `languageOptions` in `src/features/onboarding/questions.ts`.
 */
export const SUPPORTED_LANGUAGES = {
  python: 71, // Python 3.8.1
  cpp: 54, // C++ (GCC 9.2.0)
  java: 62, // Java (OpenJDK 13.0.1)
  javascript: 63, // JavaScript (Node.js 12.14.0)
} as const;

export type SubmissionLanguage = keyof typeof SUPPORTED_LANGUAGES;

export const submissionLanguages = Object.keys(SUPPORTED_LANGUAGES) as [
  SubmissionLanguage,
  ...SubmissionLanguage[],
];

export function getJudge0LanguageId(language: SubmissionLanguage): number {
  return SUPPORTED_LANGUAGES[language];
}

const editorOptions: Record<
  SubmissionLanguage,
  { label: string; starter: string }
> = {
  python: { label: "Python", starter: 'print("Hello world")\n' },
  cpp: {
    label: "C++",
    starter:
      '#include <iostream>\n\nint main() {\n    std::cout << "Hello world";\n    return 0;\n}\n',
  },
  java: {
    label: "Java",
    starter:
      'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello world");\n    }\n}\n',
  },
  javascript: { label: "JavaScript", starter: 'console.log("Hello world");\n' },
};

/** Language choices for the editor: id, display label and starter code. */
export const languages = submissionLanguages.map((id) => ({
  id,
  ...editorOptions[id],
}));

export function isSubmissionLanguage(
  value: unknown,
): value is SubmissionLanguage {
  return (
    typeof value === "string" &&
    (submissionLanguages as readonly string[]).includes(value)
  );
}
