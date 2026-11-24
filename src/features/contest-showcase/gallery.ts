import type { PublicContest } from "./service";

function searchable(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}
export function filterShowcase<T extends PublicContest>(
  contests: T[],
  phase: string,
  query: string,
) {
  const needle = searchable(query.trim());
  return contests.filter(
    (contest) =>
      (phase === "all" || contest.phase === phase) &&
      searchable(contest.title).includes(needle),
  );
}
