import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { findPublishedSearchResults } from "../src/features/search/repository";
import {
  normalizeSearchQuery,
  SEARCH_GROUP_LIMIT,
} from "../src/features/search/query";

async function main() {
  const owner = await db.user.findFirst({
    where: { role: { name: "TEACHER" } },
  });
  assert(owner, "Run npm run db:seed first");
  const suffix = randomUUID();
  const title = `ĐƯỜNG DẪN ${suffix}`;
  const pathIds: string[] = [];
  const contestIds: string[] = [];
  try {
    for (const published of [true, false]) {
      const path = await db.path.create({
        data: {
          title,
          slug: `search-${published}-${suffix}`,
          published,
          creatorId: owner.id,
          rooms: { create: { title: title.normalize("NFD"), position: 1 } },
        },
      });
      pathIds.push(path.id);
    }
    for (const status of ["PUBLISHED", "DRAFT", "FINISHED"] as const) {
      const contest = await db.contest.create({
        data: { title, slug: `search-${status}-${suffix}`, status },
      });
      contestIds.push(contest.id);
    }
    for (const query of [
      `duong dan ${suffix}`,
      title,
      title.normalize("NFD"),
    ]) {
      const result = await findPublishedSearchResults(
        normalizeSearchQuery(query),
      );
      assert.deepEqual(
        result.paths.map((p) => p.id),
        [pathIds[0]],
      );
      assert.equal(result.rooms.length, 1);
      assert.equal(result.rooms[0].slug, `search-true-${suffix}`);
      assert.equal(result.rooms[0].pathTitle, title);
      assert.deepEqual(
        result.contests.map((c) => c.id),
        [contestIds[0]],
      );
    }
    assert.deepEqual(await findPublishedSearchResults(`missing-${suffix}`), {
      paths: [],
      rooms: [],
      contests: [],
    });
    // SQL syntax and LIKE wildcards are literal, never instructions or wildcards.
    for (const query of [
      `%' OR true -- ${suffix}`,
      `%${suffix}`,
      `_${suffix}`,
    ]) {
      assert.deepEqual(await findPublishedSearchResults(query), {
        paths: [],
        rooms: [],
        contests: [],
      });
    }
    await db.path.update({
      where: { id: pathIds[0] },
      data: { title: `100%_ O'Reilly ${suffix}` },
    });
    assert.equal(
      (
        await findPublishedSearchResults(
          normalizeSearchQuery(`100%_ O'Reilly ${suffix}`),
        )
      ).paths[0]?.id,
      pathIds[0],
    );
    await db.room.createMany({
      data: Array.from({ length: SEARCH_GROUP_LIMIT + 2 }, (_, i) => ({
        pathId: pathIds[0],
        title: `limit-${suffix} ${i.toString().padStart(2, "0")}`,
        position: i + 2,
      })),
    });
    const limited = await findPublishedSearchResults(`limit-${suffix}`);
    assert.equal(limited.rooms.length, SEARCH_GROUP_LIMIT);
    assert.deepEqual(
      limited.rooms.map((r) => r.title),
      [...limited.rooms.map((r) => r.title)].sort(),
    );
    // Existing seed data must be searchable without any teacher/admin workflow.
    const seed = await db.path.findUnique({
      where: { slug: "typescript-basics" },
    });
    assert(seed?.published, "Run npm run db:seed first");
    assert(
      (
        await findPublishedSearchResults(normalizeSearchQuery(seed.title))
      ).paths.some((p) => p.id === seed.id),
    );
    console.log(
      "Search checks passed: Vietnamese accents/case, publication, grouping, literals, bounds and seed data.",
    );
  } finally {
    await db.contest.deleteMany({ where: { id: { in: contestIds } } });
    await db.path.deleteMany({ where: { id: { in: pathIds } } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
