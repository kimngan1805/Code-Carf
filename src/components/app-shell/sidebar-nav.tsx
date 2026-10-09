"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  House,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the mobile tab bar. */
  short: string;
  icon: LucideIcon;
}

export const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Học tập",
    items: [
      {
        href: "/dashboard",
        label: "Trang chủ",
        short: "Trang chủ",
        icon: House,
      },
      {
        href: "/paths",
        label: "Lộ trình học",
        short: "Lộ trình",
        icon: BookOpen,
      },
      { href: "/contests", label: "Cuộc thi", short: "Cuộc thi", icon: Trophy },
    ],
  },
  {
    title: "Cộng đồng",
    items: [
      {
        href: "/leaderboard",
        label: "Bảng xếp hạng",
        short: "Xếp hạng",
        icon: Users,
      },
    ],
  },
  {
    title: "Cá nhân",
    items: [
      {
        href: "/achievements",
        label: "Thành tích",
        short: "Thành tích",
        icon: Award,
      },
      { href: "/profile", label: "Hồ sơ", short: "Hồ sơ", icon: User },
    ],
  },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const isActive = useIsActive();
  return (
    <div className={collapsed ? "space-y-3" : "space-y-6"}>
      {navGroups.map((group, groupIndex) => (
        <div key={group.title}>
          {collapsed ? (
            groupIndex > 0 && (
              <div aria-hidden className="mx-3 mb-3 h-px bg-border/70" />
            )
          ) : (
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
              {group.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? label : undefined}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-lg text-sm whitespace-nowrap transition-colors",
                      collapsed ? "justify-center px-0" : "px-3",
                      active
                        ? "bg-secondary/40 font-semibold text-primary before:absolute before:top-2 before:bottom-2 before:-left-3 before:w-1 before:rounded-r-full before:bg-primary"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden />
                    {!collapsed && label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function MobileTabBar() {
  const isActive = useIsActive();
  return (
    <ul className="grid grid-cols-6">
      {navGroups
        .flatMap((group) => group.items)
        .map(({ href, short, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-5", active && "stroke-[2.25]")}
                  aria-hidden
                />
                {short}
              </Link>
            </li>
          );
        })}
    </ul>
  );
}
