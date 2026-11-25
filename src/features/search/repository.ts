import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SEARCH_GROUP_LIMIT } from "./query";

export type SearchRecord = {
  id: string;
  title: string;
  slug: string;
  pathTitle: string | null;
};

// PostgreSQL 16 supports Unicode normalization without installing unaccent.
// strpos treats %, _ and quotes literally; all user input stays parameterized.
function matchesTitle(title: Prisma.Sql, query: string) {
  return Prisma.sql`strpos(
    trim(regexp_replace(translate(lower(regexp_replace(normalize(${title}, NFD), '[̀-ͯ]', '', 'g')), 'đ', 'd'), '\\s+', ' ', 'g')),
    ${query}
  ) > 0`;
}

export async function findPublishedSearchResults(query: string) {
  const [paths, rooms, contests] = await Promise.all([
    db.$queryRaw<SearchRecord[]>(Prisma.sql`
      SELECT p.id, p.title, p.slug, NULL::text AS "pathTitle"
      FROM "Path" p WHERE p.published = true AND p."deletedAt" IS NULL
      AND ${matchesTitle(Prisma.sql`p.title`, query)}
      ORDER BY p.title, p.id LIMIT ${SEARCH_GROUP_LIMIT}
    `),
    db.$queryRaw<SearchRecord[]>(Prisma.sql`
      SELECT r.id, r.title, p.slug, p.title AS "pathTitle"
      FROM "Room" r JOIN "Path" p ON p.id = r."pathId"
      WHERE r.published = true AND p.published = true AND p."deletedAt" IS NULL
      AND ${matchesTitle(Prisma.sql`r.title`, query)}
      ORDER BY r.title, r.id LIMIT ${SEARCH_GROUP_LIMIT}
    `),
    db.$queryRaw<SearchRecord[]>(Prisma.sql`
      SELECT c.id, c.title, c.slug, NULL::text AS "pathTitle"
      FROM "Contest" c WHERE c.status = 'PUBLISHED'
      AND ${matchesTitle(Prisma.sql`c.title`, query)}
      ORDER BY c.title, c.id LIMIT ${SEARCH_GROUP_LIMIT}
    `),
  ]);
  return { paths, rooms, contests };
}
