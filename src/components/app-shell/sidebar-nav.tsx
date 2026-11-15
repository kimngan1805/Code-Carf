"use client";

import { RoleName } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BookOpen,
  History,
  House,
  LayoutDashboard,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { allowedRole, isTeacherRole } from "@/features/auth/permissions";
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
        href: "/hv/dashboard",
        label: "Trang chủ",
        short: "Trang chủ",
        icon: House,
      },
      {
        href: "/hv/paths",
        label: "Lộ trình học",
        short: "Lộ trình",
        icon: BookOpen,
      },
      {
        href: "/hv/submissions",
        label: "Lịch sử nộp bài",
        short: "Bài nộp",
        icon: History,
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
        href: "/hv/achievements",
        label: "Thành tích",
        short: "Thành tích",
        icon: Award,
      },
      { href: "/hv/profile", label: "Hồ sơ", short: "Hồ sơ", icon: User },
    ],
  },
];

export const teacherNavGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Giảng dạy",
    items: [
      {
        href: "/gv",
        label: "Tổng quan",
        short: "Tổng quan",
        icon: LayoutDashboard,
      },
      {
        href: "/gv/paths",
        label: "Lộ trình học",
        short: "Lộ trình",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Tổ chức",
    items: [
      { href: "/contests", label: "Cuộc thi", short: "Cuộc thi", icon: Trophy },
      {
        href: "/gv/contests",
        label: "Giám sát cuộc thi",
        short: "Giám sát",
        icon: BadgeCheck,
      },
    ],
  },
];

export const adminNavGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Quản trị",
    items: [
      {
        href: "/admin",
        label: "Tổng quan",
        short: "Tổng quan",
        icon: LayoutDashboard,
      },
      {
        href: "/admin/teacher-applications",
        label: "Duyệt giảng viên",
        short: "Giảng viên",
        icon: BadgeCheck,
      },
    ],
  },
  {
    title: "Nội dung",
    items: [
      {
        href: "/gv/contests",
        label: "Giám sát cuộc thi",
        short: "Giám sát",
        icon: BadgeCheck,
      },
      {
        href: "/gv/paths",
        label: "Lộ trình học",
        short: "Lộ trình",
        icon: BookOpen,
      },
      { href: "/contests", label: "Cuộc thi", short: "Cuộc thi", icon: Trophy },
    ],
  },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/gv" || href === "/admin"
      ? pathname === href
      : pathname === href ||
        pathname.startsWith(`${href}/`) ||
        (href === "/hv/paths" && pathname.startsWith("/hv/rooms/"));
}

function getVisibleNavGroups(role: RoleName) {
  const base =
    role === RoleName.ADMIN
      ? adminNavGroups
      : isTeacherRole(role)
        ? teacherNavGroups
        : navGroups;
  return base
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedRole(item.href, role)),
    }))
    .filter((group) => group.items.length > 0);
}

export function SidebarNav({
  collapsed = false,
  role = RoleName.STUDENT,
}: {
  collapsed?: boolean;
  role?: RoleName;
}) {
  const isActive = useIsActive();
  const groups = getVisibleNavGroups(role);
  return (
    <div className={collapsed ? "space-y-3" : "space-y-6"}>
      {groups.map((group, groupIndex) => (
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

export function MobileTabBar({ role = RoleName.STUDENT }: { role?: RoleName }) {
  const isActive = useIsActive();
  const items = getVisibleNavGroups(role).flatMap((group) => group.items);
  return (
    <ul
      className={
        items.length === 4
          ? "grid grid-cols-4"
          : items.length === 3
            ? "grid grid-cols-3"
            : "grid grid-cols-6"
      }
    >
      {items.map(({ href, short, icon: Icon }) => {
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
