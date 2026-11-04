export type ViolationStatus = {
  violationCount: number;
  threshold: number;
  flagged: boolean;
};

export function violationStatus(
  count: number,
  threshold: number,
  flaggedAt: Date | null,
): ViolationStatus {
  return {
    violationCount: count,
    threshold,
    flagged: !!flaggedAt || count > threshold,
  };
}
