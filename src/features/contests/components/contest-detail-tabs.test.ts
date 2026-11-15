import React, { type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  stateCursor: 0,
  refCursor: 0,
  states: [] as unknown[],
  refs: [] as Array<{ current: unknown }>,
  effects: [] as Array<() => void | (() => void)>,
  contextValue: null as unknown,
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  useContestLeaderboardMock: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    createContext: () => ({
      Provider: ({
        value,
        children,
      }: {
        value: unknown;
        children: ReactNode;
      }) => {
        hooks.contextValue = value;
        return children;
      },
    }),
    useContext: () => hooks.contextValue,
    useState: (initial: unknown) => {
      const index = hooks.stateCursor++;
      if (!(index in hooks.states)) {
        hooks.states[index] =
          typeof initial === "function"
            ? (initial as () => unknown)()
            : initial;
      }
      return [
        hooks.states[index],
        (value: unknown) => {
          hooks.states[index] =
            typeof value === "function"
              ? (value as (prev: unknown) => unknown)(hooks.states[index])
              : value;
        },
      ];
    },
    useRef: (initial: unknown) => {
      const index = hooks.refCursor++;
      if (!(index in hooks.refs)) {
        hooks.refs[index] = { current: initial };
      }
      return hooks.refs[index];
    },
    useCallback: (fn: unknown) => fn,
    useEffect: (run: () => void | (() => void)) => {
      hooks.effects.push(run);
    },
  };
});

vi.mock("next/navigation", () => ({
  redirect: hooks.redirectMock,
}));

vi.mock("@/features/leaderboard/components/use-contest-leaderboard", () => ({
  useContestLeaderboard: hooks.useContestLeaderboardMock,
}));

import ContestLeaderboardRedirectPage from "@/app/(student)/contests/[slug]/leaderboard/page";
import { ContestLeaderboardTabPanel } from "@/features/leaderboard/components/contest-leaderboard-view";
import {
  buildContestTabUrl,
  parseContestDetailTab,
  type ContestDetailTab,
} from "../tab-url";
import {
  ContestDetailTabs,
  ContestOpenLeaderboardButton,
  ContestTabProvider,
} from "./contest-detail-tabs";

function findElements(
  node: ReactNode,
  predicate: (el: ReactElement<Record<string, unknown>>) => boolean,
): Array<ReactElement<Record<string, unknown>>> {
  const found: Array<ReactElement<Record<string, unknown>>> = [];
  const visit = (item: ReactNode): void => {
    if (
      !item ||
      typeof item === "boolean" ||
      typeof item === "string" ||
      typeof item === "number"
    ) {
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (React.isValidElement<Record<string, unknown>>(item)) {
      if (predicate(item)) {
        found.push(item);
      }
      if ("children" in item.props) {
        visit(item.props.children as ReactNode);
      }
    }
  };
  visit(node);
  return found;
}

let cleanups: Array<() => void> = [];
let windowTarget: EventTarget;
let currentUrl = "/contests/sample-contest";

function flushEffects() {
  for (const run of hooks.effects) {
    const cleanup = run();
    if (typeof cleanup === "function") {
      cleanups.push(cleanup);
    }
  }
  hooks.effects.length = 0;
}

function renderTabsTree(
  initialTab: ContestDetailTab,
  canViewLeaderboard: boolean,
  overviewNode: ReactNode = React.createElement("div", {
    "data-overview": "kept",
  }),
) {
  hooks.stateCursor = 0;
  hooks.refCursor = 0;
  hooks.effects.length = 0;

  const providerElement = ContestTabProvider({
    slug: "sample-contest",
    initialTab,
    children: null,
  }) as ReactElement<{ value: unknown }>;
  hooks.contextValue = providerElement.props.value;

  const tree = ContestDetailTabs({
    canViewLeaderboard,
    overview: overviewNode,
  });
  flushEffects();
  return tree;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of cleanups) fn();
  cleanups = [];
  hooks.states.length = 0;
  hooks.refs.length = 0;
  hooks.effects.length = 0;
  hooks.stateCursor = 0;
  hooks.refCursor = 0;
  currentUrl = "/contests/sample-contest";

  windowTarget = new EventTarget();
  const fakeWindow = {
    addEventListener: windowTarget.addEventListener.bind(windowTarget),
    removeEventListener: windowTarget.removeEventListener.bind(windowTarget),
    dispatchEvent: windowTarget.dispatchEvent.bind(windowTarget),
    scrollTo: vi.fn(),
    get location() {
      const parsed = new URL(`http://localhost${currentUrl}`);
      return {
        pathname: parsed.pathname,
        search: parsed.search,
      };
    },
    history: {
      pushState: vi.fn((_state: unknown, _title: string, nextUrl: string) => {
        currentUrl = nextUrl;
      }),
    },
  };
  vi.stubGlobal("window", fakeWindow);

  hooks.useContestLeaderboardMock.mockReturnValue({
    data: null,
    status: "realtime",
    error: null,
    isRefreshing: false,
    lastUpdatedAt: null,
    refreshNow: vi.fn(),
  });
});

afterEach(() => {
  for (const fn of cleanups) fn();
  cleanups = [];
  vi.unstubAllGlobals();
});

describe("contest detail tab helpers", () => {
  it("normalizes missing or invalid tab query values to overview", () => {
    expect(parseContestDetailTab(undefined)).toBe("overview");
    expect(parseContestDetailTab(null)).toBe("overview");
    expect(parseContestDetailTab("invalid")).toBe("overview");
    expect(parseContestDetailTab("overview")).toBe("overview");
    expect(parseContestDetailTab("leaderboard")).toBe("leaderboard");
  });

  it("builds URLs preserving unrelated params while toggling tab=leaderboard", () => {
    expect(
      buildContestTabUrl("/contests/sample-contest", "", "leaderboard"),
    ).toBe("/contests/sample-contest?tab=leaderboard");
    expect(
      buildContestTabUrl(
        "/contests/sample-contest",
        "?tab=leaderboard&foo=1",
        "overview",
      ),
    ).toBe("/contests/sample-contest?foo=1");
  });

  it("redirects legacy /contests/[slug]/leaderboard route to /contests/[slug]?tab=leaderboard", async () => {
    await expect(
      ContestLeaderboardRedirectPage({
        params: Promise.resolve({ slug: "sample-contest" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/contests/sample-contest?tab=leaderboard");
  });
});

describe("ContestDetailTabs interaction & SSE lifecycle", () => {
  it("shows overview by default without mounting the leaderboard panel", () => {
    const tree = renderTabsTree("overview", true);
    const tabs = findElements(tree, (el) => el.props.role === "tab");
    const panels = findElements(tree, (el) => el.props.role === "tabpanel");

    expect(tabs[0].props["aria-selected"]).toBe(true);
    expect(tabs[1].props["aria-selected"]).toBe(false);
    expect(panels[0].props.hidden).toBe(false);
    expect(panels[1].props.hidden).toBe(true);
    expect(
      findElements(panels[1], (el) => el.type === ContestLeaderboardTabPanel),
    ).toHaveLength(0);
  });

  it("switches to leaderboard on tab click, pushes URL without reload, and keeps overview mounted", () => {
    let tree = renderTabsTree("overview", true);
    const tabs = findElements(tree, (el) => el.props.role === "tab");

    (tabs[1].props.onClick as () => void)();
    expect(currentUrl).toBe("/contests/sample-contest?tab=leaderboard");

    tree = renderTabsTree("overview", true);
    const updatedPanels = findElements(
      tree,
      (el) => el.props.role === "tabpanel",
    );
    expect(updatedPanels[0].props.hidden).toBe(true);
    // Overview content remains mounted in the hidden tabpanel so registration state is preserved.
    expect(
      findElements(
        updatedPanels[0],
        (el) => el.props["data-overview"] === "kept",
      ),
    ).toHaveLength(1);
    expect(updatedPanels[1].props.hidden).toBe(false);

    const panel = findElements(
      updatedPanels[1],
      (el) => el.type === ContestLeaderboardTabPanel,
    )[0];
    expect(panel.props.slug).toBe("sample-contest");
    expect(panel.props.canView).toBe(true);
  });

  it("switches to leaderboard tab via ContestOpenLeaderboardButton instead of page navigation", () => {
    renderTabsTree("overview", true);
    const buttonTree = ContestOpenLeaderboardButton({});
    expect(findElements(buttonTree, (el) => el.type === "a")).toHaveLength(0);

    const onClick = buttonTree.props.onClick as () => void;
    onClick();

    expect(currentUrl).toBe("/contests/sample-contest?tab=leaderboard");
    expect(hooks.states[0]).toBe("leaderboard");
  });

  it("supports browser Back and Forward via popstate and keyboard arrow navigation", () => {
    const initialTree = renderTabsTree("overview", true);
    const initialTabs = findElements(
      initialTree,
      (el) => el.props.role === "tab",
    );

    const preventDefault = vi.fn();
    (
      initialTabs[0].props.onKeyDown as (event: {
        key: string;
        preventDefault: () => void;
      }) => void
    )({ key: "ArrowRight", preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(currentUrl).toBe("/contests/sample-contest?tab=leaderboard");
    expect(hooks.states[0]).toBe("leaderboard");

    // Simulate browser Back button returning to /contests/sample-contest
    currentUrl = "/contests/sample-contest";
    windowTarget.dispatchEvent(new Event("popstate"));
    expect(hooks.states[0]).toBe("overview");

    // Simulate browser Forward button returning to ?tab=leaderboard
    currentUrl = "/contests/sample-contest?tab=leaderboard";
    windowTarget.dispatchEvent(new Event("popstate"));
    expect(hooks.states[0]).toBe("leaderboard");
  });

  it("opens leaderboard directly when initialTab is leaderboard and disables SSE for unauthorized viewers", () => {
    const tree = renderTabsTree("leaderboard", false);
    const panels = findElements(tree, (el) => el.props.role === "tabpanel");
    const panel = findElements(
      panels[1],
      (el) => el.type === ContestLeaderboardTabPanel,
    )[0];

    expect(panels[1].props.hidden).toBe(false);
    expect(panel.props.canView).toBe(false);

    // Executing ContestLeaderboardTabPanel directly confirms useContestLeaderboard is called with enabled: false.
    ContestLeaderboardTabPanel({
      slug: "sample-contest",
      canView: false,
    });
    expect(hooks.useContestLeaderboardMock).toHaveBeenCalledWith({
      slug: "sample-contest",
      enabled: false,
    });
  });
});
