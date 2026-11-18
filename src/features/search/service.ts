import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { findPublishedSearchResults } from "./repository";
import { normalizeSearchQuery, SEARCH_MAX_LENGTH } from "./query";

export async function searchLearningContent(input: string) {
  await requireRole([RoleName.STUDENT]);
  const query = input.trim();
  if (query.length > SEARCH_MAX_LENGTH)
    return { query, tooLong: true, paths: [], rooms: [], contests: [] };
  const normalized = normalizeSearchQuery(query);
  const results = normalized
    ? await findPublishedSearchResults(normalized)
    : { paths: [], rooms: [], contests: [] };
  return { query, tooLong: false, ...results };
}
