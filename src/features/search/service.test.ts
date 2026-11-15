import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "@prisma/client";

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), search: vi.fn() }));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("./repository", () => ({ findPublishedSearchResults: mocks.search }));

import { searchLearningContent } from "./service";
import { normalizeSearchQuery, SEARCH_MAX_LENGTH } from "./query";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({
    id: "student",
    role: { name: RoleName.STUDENT },
  });
  mocks.search.mockResolvedValue({ paths: [], rooms: [], contests: [] });
});

describe("learning content search", () => {
  it.each([
    "ĐƯỜNG DẪN",
    "đường dẫn",
    "duong dan",
    "  DUONG   DAN  ",
    "Đường dẫn".normalize("NFD"),
  ])("normalizes Vietnamese query %s", async (query) => {
    await searchLearningContent(query);
    expect(mocks.search).toHaveBeenCalledWith("duong dan");
  });

  it.each(["", "   ", "\u0301"])(
    "does not query the catalog for an empty search %j",
    async (query) => {
      expect(await searchLearningContent(query)).toMatchObject({
        paths: [],
        rooms: [],
        contests: [],
      });
      expect(mocks.search).not.toHaveBeenCalled();
    },
  );

  it("bounds the query length before database access", async () => {
    expect(
      await searchLearningContent("a".repeat(SEARCH_MAX_LENGTH + 1)),
    ).toMatchObject({ tooLong: true });
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it("returns grouped records and preserves the original query for display", async () => {
    const records = {
      paths: [
        { id: "path", title: "Đường dẫn", slug: "path", pathTitle: null },
      ],
      rooms: [],
      contests: [],
    };
    mocks.search.mockResolvedValue(records);
    expect(await searchLearningContent(" Đường dẫn ")).toEqual({
      query: "Đường dẫn",
      tooLong: false,
      ...records,
    });
    expect(mocks.requireRole).toHaveBeenCalledWith([RoleName.STUDENT]);
  });

  it("never reads content when authentication or role validation fails", async () => {
    mocks.requireRole.mockRejectedValue(new Error("forbidden"));
    await expect(searchLearningContent("typescript")).rejects.toThrow(
      "forbidden",
    );
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it("keeps punctuation literal", () => {
    expect(normalizeSearchQuery("100%_ O'Reilly")).toBe("100%_ o'reilly");
  });
});
