"use client";

import { RoleName } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
import {
  CodeXml,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { allowedRole, isTeacherRole } from "@/features/auth/permissions";
import { cn } from "@/lib/utils";
import { SIDEBAR_COOKIE } from "./constants";
import { SidebarNav } from "./sidebar-nav";

function initials(name: string) {
  return (name.trim().split(/\s+/).at(-1)?.[0] ?? "?").toUpperCase();
}

export function Sidebar({
  userName,
  initialCollapsed,
  role = RoleName.STUDENT,
}: {
  userName: string;
  initialCollapsed: boolean;
  role?: RoleName;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const teacherMode = isTeacherRole(role);
  const canViewProfile = allowedRole("/hv/profile", role);
  const homeHref = teacherMode ? "/gv" : "/hv/dashboard";
  const accountHref = teacherMode
    ? "/gv"
    : canViewProfile
      ? "/hv/profile"
      : role === RoleName.GUEST
        ? "/onboarding/teacher/submitted"
        : "/grading";
  const roleLabel =
    role === RoleName.ADMIN
      ? "Quản trị viên"
      : role === RoleName.GRADER
        ? "Giám khảo"
        : role === RoleName.GUEST
          ? "Khách"
          : "Không gian giảng viên";

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // Cookie so the server renders the same width on the next load (no flash).
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên";

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border/70 bg-background transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
          collapsed ? "justify-center" : "justify-between pr-3 pl-6",
        )}
      >
        <Link
          href={homeHref}
          aria-label="Code Carf"
          className="flex items-center gap-2.5 text-lg font-bold whitespace-nowrap text-primary"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CodeXml className="size-5" aria-hidden />
          </span>
          {!collapsed && "Code Carf"}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            title={toggleLabel}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ToggleIcon className="size-[18px]" aria-hidden />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            title={toggleLabel}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ToggleIcon className="size-[18px]" aria-hidden />
          </button>
        </div>
      )}

      <nav
        aria-label="Chính"
        className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4"
      >
        <SidebarNav collapsed={collapsed} role={role} />
      </nav>

      <div className="border-t border-border/70 p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href={accountHref}
              aria-label={canViewProfile ? `Hồ sơ của ${userName}` : userName}
              title={userName}
              className="grid size-9 place-items-center rounded-full bg-secondary/60 text-sm font-semibold text-primary"
            >
              {initials(userName)}
            </Link>
            <Link
              href="/settings"
              aria-label="Cài đặt tài khoản"
              title="Cài đặt tài khoản"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-[18px]" aria-hidden />
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
              >
                <LogOut className="size-[18px]" aria-hidden />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary/60 text-sm font-semibold text-primary">
              {initials(userName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {canViewProfile ? (
                  <Link href="/hv/profile" className="hover:text-primary">
                    Xem hồ sơ
                  </Link>
                ) : (
                  <span className="truncate">{roleLabel}</span>
                )}
              </div>
            </div>
            <Link
              href="/settings"
              aria-label="Cài đặt tài khoản"
              title="Cài đặt tài khoản"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-[18px]" aria-hidden />
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
              >
                <LogOut className="size-[18px]" aria-hidden />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
