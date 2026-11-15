"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { LayoutGrid, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContestLeaderboardTabPanel } from "@/features/leaderboard/components/contest-leaderboard-view";
import { cn } from "@/lib/utils";
import {
  buildContestTabUrl,
  parseContestDetailTab,
  type ContestDetailTab,
} from "../tab-url";

interface ContestTabContextValue {
  slug: string;
  activeTab: ContestDetailTab;
  selectTab: (tab: ContestDetailTab) => void;
}

const ContestTabContext = createContext<ContestTabContextValue | null>(null);

export function ContestTabProvider({
  slug,
  initialTab,
  children,
}: {
  slug: string;
  initialTab: ContestDetailTab;
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<ContestDetailTab>(initialTab);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const next = parseContestDetailTab(
        new URLSearchParams(window.location.search).get("tab"),
      );
      setActiveTab(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const selectTab = useCallback(
    (nextTab: ContestDetailTab) => {
      if (nextTab === activeTab) return;
      if (typeof window !== "undefined") {
        const nextUrl = buildContestTabUrl(
          window.location.pathname,
          window.location.search,
          nextTab,
        );
        window.history.pushState(null, "", nextUrl);
      }
      setActiveTab(nextTab);
    },
    [activeTab],
  );

  return (
    <ContestTabContext.Provider value={{ slug, activeTab, selectTab }}>
      {children}
    </ContestTabContext.Provider>
  );
}

export function useContestTab(): ContestTabContextValue {
  const ctx = useContext(ContestTabContext);
  if (!ctx) {
    throw new Error("useContestTab must be used within ContestTabProvider");
  }
  return ctx;
}

export function ContestOpenLeaderboardButton({
  className,
}: {
  className?: string;
}) {
  const { selectTab } = useContestTab();

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full", className)}
      onClick={() => {
        selectTab("leaderboard");
        if (
          typeof window !== "undefined" &&
          typeof window.scrollTo === "function"
        ) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
    >
      <Trophy className="size-4" aria-hidden="true" />
      <span>Xem bảng xếp hạng</span>
    </Button>
  );
}

export function ContestDetailTabs({
  canViewLeaderboard,
  overview,
}: {
  canViewLeaderboard: boolean;
  overview: ReactNode;
}) {
  const { slug, activeTab, selectTab } = useContestTab();
  const overviewTabRef = useRef<HTMLButtonElement | null>(null);
  const leaderboardTabRef = useRef<HTMLButtonElement | null>(null);

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: ContestDetailTab,
  ) => {
    let target: ContestDetailTab | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      target = current === "overview" ? "leaderboard" : "overview";
    } else if (event.key === "Home") {
      target = "overview";
    } else if (event.key === "End") {
      target = "leaderboard";
    }
    if (!target) return;

    event.preventDefault();
    selectTab(target);
    if (target === "overview") {
      overviewTabRef.current?.focus();
    } else {
      leaderboardTabRef.current?.focus();
    }
  };

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Thông tin cuộc thi"
        className="inline-flex w-full rounded-2xl border border-border/70 bg-muted/70 p-1 sm:w-auto"
      >
        <button
          ref={overviewTabRef}
          type="button"
          role="tab"
          id="contest-tab-overview"
          aria-selected={activeTab === "overview"}
          aria-controls="contest-panel-overview"
          tabIndex={activeTab === "overview" ? 0 : -1}
          onClick={() => selectTab("overview")}
          onKeyDown={(event) => handleTabKeyDown(event, "overview")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-ring sm:flex-none",
            activeTab === "overview"
              ? "bg-background text-primary shadow-sm ring-1 ring-border/70"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
          <span>Tổng quan</span>
        </button>

        <button
          ref={leaderboardTabRef}
          type="button"
          role="tab"
          id="contest-tab-leaderboard"
          aria-selected={activeTab === "leaderboard"}
          aria-controls="contest-panel-leaderboard"
          tabIndex={activeTab === "leaderboard" ? 0 : -1}
          onClick={() => selectTab("leaderboard")}
          onKeyDown={(event) => handleTabKeyDown(event, "leaderboard")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-ring sm:flex-none",
            activeTab === "leaderboard"
              ? "bg-background text-primary shadow-sm ring-1 ring-border/70"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Trophy className="size-4" aria-hidden="true" />
          <span>Bảng xếp hạng</span>
        </button>
      </div>

      <div
        role="tabpanel"
        id="contest-panel-overview"
        aria-labelledby="contest-tab-overview"
        hidden={activeTab !== "overview"}
      >
        {overview}
      </div>

      <div
        role="tabpanel"
        id="contest-panel-leaderboard"
        aria-labelledby="contest-tab-leaderboard"
        hidden={activeTab !== "leaderboard"}
      >
        {activeTab === "leaderboard" && (
          <ContestLeaderboardTabPanel
            slug={slug}
            canView={canViewLeaderboard}
          />
        )}
      </div>
    </div>
  );
}
