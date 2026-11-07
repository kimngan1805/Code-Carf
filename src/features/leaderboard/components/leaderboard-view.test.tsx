import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { XpLeaderboardView } from "../service";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

import {
  buildLeaderboardHref,
  getAvatarInitials,
  LeaderboardView,
} from "./leaderboard-view";

function makeView(overrides?: Partial<XpLeaderboardView>): XpLeaderboardView {
  return {
    period: "all",
    selectedPath: null,
    paths: [
      { id: "p-1", slug: "nhap-mon-lap-trinh", title: "Nhập môn lập trình" },
      { id: "p-2", slug: "ctdl-giai-thuat", title: "CTDL & Giải thuật" },
    ],
    weekRange: null,
    entries: [
      {
        rank: 1,
        userId: "u-1",
        name: "Trần Minh Anh",
        xp: 2100,
        isCurrentUser: false,
      },
      {
        rank: 2,
        userId: "u-2",
        name: "Lê Quốc Bảo",
        xp: 1600,
        isCurrentUser: false,
      },
      {
        rank: 3,
        userId: "u-me",
        name: "Minh Thư",
        xp: 1250,
        isCurrentUser: true,
      },
      {
        rank: 4,
        userId: "u-4",
        name: "Phạm Thu Hà",
        xp: 900,
        isCurrentUser: false,
      },
      {
        rank: 5,
        userId: "u-5",
        name: "Võ Gia Huy",
        xp: 400,
        isCurrentUser: false,
      },
    ],
    totalRankedLearners: 5,
    myStanding: {
      userId: "u-me",
      name: "Minh Thư",
      xp: 1250,
      rank: 3,
      inTop: true,
    },
    ...overrides,
  };
}

describe("buildLeaderboardHref & getAvatarInitials", () => {
  it("builds clean query links preserving period and path filters", () => {
    expect(buildLeaderboardHref("all")).toBe("/leaderboard");
    expect(buildLeaderboardHref("all", null)).toBe("/leaderboard");
    expect(buildLeaderboardHref("week")).toBe("/leaderboard?period=week");
    expect(buildLeaderboardHref("all", "ctdl-giai-thuat")).toBe(
      "/leaderboard?path=ctdl-giai-thuat",
    );
    expect(buildLeaderboardHref("week", "ctdl-giai-thuat")).toBe(
      "/leaderboard?period=week&path=ctdl-giai-thuat",
    );
  });

  it("extracts avatar initials from Vietnamese and single-word names", () => {
    expect(getAvatarInitials("Trần Minh Anh")).toBe("TA");
    expect(getAvatarInitials("Minh Thư")).toBe("MT");
    expect(getAvatarInitials("An")).toBe("AN");
    expect(getAvatarInitials("   ")).toBe("?");
  });
});

describe("LeaderboardView", () => {
  it("renders hero, my standing card, top 3 podium, and compact ranking cards for #4+", () => {
    const html = renderToStaticMarkup(
      React.createElement(LeaderboardView, { data: makeView() }),
    );

    expect(html).toContain('id="leaderboard-page-title"');
    expect(html).toContain("Xếp hạng XP");
    expect(html).toContain('id="my-standing-heading"');
    expect(html).toContain("Thứ hạng của bạn");
    expect(html).toContain("#3 / 5");
    expect(html).toContain("Vinh danh Top 3");
    expect(html).toContain("Các thứ hạng tiếp theo");
    expect(html).toContain("Phạm Thu Hà");
    expect(html).toContain("Võ Gia Huy");
    expect(html).toContain("#4");
    expect(html).toContain("#5");
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('href="/hv/profile"');
    expect(html).toContain('href="/u/u-1"');
    expect(html).toContain('role="progressbar"');
  });

  it("renders competition ties (1, 1, 3) accurately on the podium without mislabelling tied #1 as #2", () => {
    const html = renderToStaticMarkup(
      React.createElement(LeaderboardView, {
        data: makeView({
          entries: [
            {
              rank: 1,
              userId: "u-a",
              name: "Phạm Thu Hà",
              xp: 15,
              isCurrentUser: false,
            },
            {
              rank: 1,
              userId: "u-b",
              name: "Võ Gia Huy",
              xp: 15,
              isCurrentUser: false,
            },
            {
              rank: 3,
              userId: "u-me",
              name: "Minh Thư",
              xp: 10,
              isCurrentUser: true,
            },
          ],
          totalRankedLearners: 3,
          myStanding: {
            userId: "u-me",
            name: "Minh Thư",
            xp: 10,
            rank: 3,
            inTop: true,
          },
        }),
      }),
    );

    const podiumSection = html.split('id="podium-heading"')[1] ?? "";
    expect(podiumSection).toContain("Vinh danh Top 3");
    expect(podiumSection).toContain("#1");
    expect(podiumSection).toContain("#3");
    expect(podiumSection).not.toContain("#2");
    expect(html).not.toContain('id="leaderboard-list-heading"');
  });

  it("adapts podium cleanly when fewer than 3 learners have XP", () => {
    const twoLearners = renderToStaticMarkup(
      React.createElement(LeaderboardView, {
        data: makeView({
          entries: [
            {
              rank: 1,
              userId: "u-1",
              name: "Trần Minh Anh",
              xp: 500,
              isCurrentUser: false,
            },
            {
              rank: 2,
              userId: "u-me",
              name: "Minh Thư",
              xp: 200,
              isCurrentUser: true,
            },
          ],
          totalRankedLearners: 2,
          myStanding: {
            userId: "u-me",
            name: "Minh Thư",
            xp: 200,
            rank: 2,
            inTop: true,
          },
        }),
      }),
    );

    expect(twoLearners).toContain("Vinh danh Top 2");
    expect(twoLearners).toContain("sm:grid-cols-2");
    expect(twoLearners).not.toContain('id="leaderboard-list-heading"');
  });

  it("displays outside-top personal standing in hero and ranking list footer when inTop=false", () => {
    const html = renderToStaticMarkup(
      React.createElement(LeaderboardView, {
        data: makeView({
          period: "week",
          selectedPath: {
            id: "p-2",
            slug: "ctdl-giai-thuat",
            title: "CTDL & Giải thuật",
          },
          weekRange: {
            startsAt: new Date("2026-04-06T00:00:00+07:00"),
            endsAt: new Date("2026-04-13T00:00:00+07:00"),
          },
          entries: [
            {
              rank: 1,
              userId: "u-1",
              name: "Trần Minh Anh",
              xp: 50,
              isCurrentUser: false,
            },
            {
              rank: 2,
              userId: "u-2",
              name: "Lê Quốc Bảo",
              xp: 40,
              isCurrentUser: false,
            },
            {
              rank: 3,
              userId: "u-3",
              name: "Phạm Thu Hà",
              xp: 30,
              isCurrentUser: false,
            },
            {
              rank: 4,
              userId: "u-4",
              name: "Võ Gia Huy",
              xp: 20,
              isCurrentUser: false,
            },
          ],
          totalRankedLearners: 52,
          myStanding: {
            userId: "u-me",
            name: "Minh Thư",
            xp: 10,
            rank: 52,
            inTop: false,
          },
        }),
      }),
    );

    expect(html).toContain("CTDL &amp; Giải thuật");
    expect(html).toContain("#52 / 52");
    expect(html).toContain("ngoài Top 4");
    expect(html).toMatch(/06[/-]04/);
    expect(html).toMatch(/12[/-]04/);
  });

  it("renders friendly empty state with reset action when no entries exist", () => {
    const html = renderToStaticMarkup(
      React.createElement(LeaderboardView, {
        data: makeView({
          period: "week",
          selectedPath: {
            id: "p-1",
            slug: "nhap-mon-lap-trinh",
            title: "Nhập môn lập trình",
          },
          entries: [],
          totalRankedLearners: 0,
          myStanding: {
            userId: "u-me",
            name: "Minh Thư",
            xp: 0,
            rank: null,
            inTop: false,
          },
        }),
      }),
    );

    expect(html).toContain("Chưa có dữ liệu xếp hạng");
    expect(html).toContain("Chưa có XP trong bộ lọc này");
    expect(html).toContain("Xem toàn hệ thống");
    expect(html).toContain('href="/leaderboard?period=week"');
  });
});
