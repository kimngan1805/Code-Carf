import {
  submissionLanguages,
  type SubmissionLanguage,
} from "@/features/grading/languages";

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

export const languages = submissionLanguages.map((id) => ({
  id,
  ...editorOptions[id],
}));
export type SolutionLanguage = SubmissionLanguage;
