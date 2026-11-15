export type ContestDetailTab = "overview" | "leaderboard";

export function parseContestDetailTab(
  value: string | null | undefined,
): ContestDetailTab {
  return value === "leaderboard" ? "leaderboard" : "overview";
}

export function buildContestTabUrl(
  pathname: string,
  search: string,
  tab: ContestDetailTab,
): string {
  const params = new URLSearchParams(search);
  if (tab === "leaderboard") {
    params.set("tab", "leaderboard");
  } else {
    params.delete("tab");
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
