export interface GradeRequest {
  source: string;
  languageId: number;
  input: string;
  expected: string;
}
export interface GradeResult {
  status: "MOCKED" | "ACCEPTED" | "REJECTED" | "ERROR";
  feedback: string;
}
export interface GradingAdapter {
  grade(request: GradeRequest): Promise<GradeResult>;
}
