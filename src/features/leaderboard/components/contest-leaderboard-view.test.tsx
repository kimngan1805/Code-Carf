import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ContestLeaderboardData } from "@/features/leaderboard/contest-leaderboard";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

import {
  ContestLeaderboardContent,
  ContestLeaderboardPanel,
  ContestLeaderboardStatusBadge,
  ContestLeaderboardTabPanel,
} from "./contest-leaderboard-view";

function makeData(
  overrides?: Partial<ContestLeaderboardData>,
): ContestLeaderboardData {
  return {
    contest: {
      id: "c-1",
      slug: "sample-contest",
      title: "Sample Contest",
      status: "PUBLISHED",
      penaltyMinutes: 20,
      examStartsAt: "2026-11-15T01:00:00.000Z",
      examEndsAt: "2026-11-15T05:00:00.000Z",
      exerciseCount: 2,
    },
    version: 3,
    updatedAt: "2026-11-15T10:15:30.000Z",
    entries: [
      {
        rank: 1,
        userId: "u-1",
        name: "Trần Minh Anh",
        score: 200,
        penaltyMinutes: 0,
        finished: true,
        isCurrentUser: false,
      },
      {
        rank: 2,
        userId: "u-2",
        name: "Lê Quốc Bảo",
        score: 150,
        penaltyMinutes: 20,
        finished: true,
        isCurrentUser: false,
      },
      {
        rank: 2,
        userId: "u-3",
        name: "Phạm Thu Hà",
        score: 150,
        penaltyMinutes: 20,
        finished: false,
        isCurrentUser: true,
      },
    ],
    totalParticipants: 3,
    myStanding: {
      userId: "u-3",
      name: "Phạm Thu Hà",
      score: 150,
      penaltyMinutes: 20,
      rank: 2,
      inTop: true,
    },
    ...overrides,
  };
}

describe("ContestLeaderboardStatusBadge", () => {
  it("renders Realtime, Polling, and Disconnected labels with distinct status attributes", () => {
    const realtime = renderToStaticMarkup(
      React.createElement(ContestLeaderboardStatusBadge, {
        status: "realtime",
      }),
    );
    const polling = renderToStaticMarkup(
      React.createElement(ContestLeaderboardStatusBadge, { status: "polling" }),
    );
    const disconnected = renderToStaticMarkup(
      React.createElement(ContestLeaderboardStatusBadge, {
        status: "disconnected",
      }),
    );

    expect(realtime).toContain('data-status="realtime"');
    expect(realtime).toContain("Realtime");
    expect(polling).toContain('data-status="polling"');
    expect(polling).toContain("Polling");
    expect(disconnected).toContain('data-status="disconnected"');
    expect(disconnected).toContain("Disconnected");
  });
});

describe("ContestLeaderboardContent", () => {
  it("renders Top 3 podium with competition tie ranks, my standing, scores, and penalty minutes", () => {
    const html = renderToStaticMarkup(
      React.createElement(ContestLeaderboardContent, {
        data: makeData(),
        status: "realtime",
        backHref: "/contests/sample-contest",
      }),
    );

    expect(html).toContain("Sample Contest");
    expect(html).toContain("Trần Minh Anh");
    expect(html).toContain("Lê Quốc Bảo");
    expect(html).toContain("Phạm Thu Hà");
    expect(html).toContain("Thứ hạng của bạn");
    expect(html).toContain("#1");
    expect(html).toContain("#2");
    expect(html).toContain("20 phút");
    expect(html).toContain('href="/contests/sample-contest"');
    expect(html).toContain('data-current-user="true"');
  });

  it("renders readOnly compact mode inside contest workspace without outbound navigation links", () => {
    const html = renderToStaticMarkup(
      React.createElement(ContestLeaderboardContent, {
        data: makeData(),
        status: "polling",
        backHref: "/contests/sample-contest",
        readOnly: true,
        compact: true,
      }),
    );

    expect(html).toContain("Polling");
    expect(html).toContain("Trần Minh Anh");
    expect(html).not.toContain("<a ");
  });

  it("shows outside-top note when learner is ranked outside Top N", () => {
    const html = renderToStaticMarkup(
      React.createElement(ContestLeaderboardContent, {
        data: makeData({
          myStanding: {
            userId: "u-99",
            name: "Minh Thư",
            score: 0,
            penaltyMinutes: 0,
            rank: 55,
            inTop: false,
          },
          totalParticipants: 55,
        }),
        status: "realtime",
      }),
    );

    expect(html).toContain("#55");
    expect(html).toContain("Ngoài Top 3");
  });

  it("uses a compact hero toolbar without repeating the contest title in compactHero mode", () => {
    const html = renderToStaticMarkup(
      React.createElement(ContestLeaderboardContent, {
        data: makeData(),
        status: "realtime",
        readOnly: true,
        heroVariant: "compact",
      }),
    );

    expect(html).toContain("Bảng xếp hạng trực tiếp");
    expect(html).toContain("3 thí sinh");
    expect(html).toContain("Trần Minh Anh");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<a ");
  });
});

describe("ContestLeaderboardTabPanel & ContestLeaderboardPanel", () => {
  it("renders a restricted notice without connecting SSE when viewer cannot view leaderboard", () => {
    const html = renderToStaticMarkup(
      React.createElement(ContestLeaderboardTabPanel, {
        slug: "sample-contest",
        canView: false,
      }),
    );

    expect(html).toContain("Bảng xếp hạng chỉ mở cho thí sinh đã đăng ký");
    expect(html).not.toContain("<a ");
  });

  it("renders loading skeleton for authorized participant before initial data resolves", () => {
    const html = renderToStaticMarkup(
      React.createElement(ContestLeaderboardTabPanel, {
        slug: "sample-contest",
        canView: true,
      }),
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Đang tải bảng xếp hạng");
  });

  it("renders ContestLeaderboardPanel drawer with close button and no navigation links", () => {
    const html = renderToStaticMarkup(
      React.createElement(ContestLeaderboardPanel, {
        slug: "sample-contest",
        open: true,
        onClose: () => {},
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Đóng bảng xếp hạng"');
    expect(html).not.toContain("<a ");
  });
});
