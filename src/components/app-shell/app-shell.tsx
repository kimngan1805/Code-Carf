import { RoleName } from "@prisma/client";
import Link from "next/link";
import { Bell, BookOpen, CodeXml, LogOut, Plus, Search } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { allowedRole, isTeacherRole } from "@/features/auth/permissions";
import { APP_TIME_ZONE } from "@/features/progress/week-activity";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";

function initials(name: string) {
  return (name.trim().split(/\s+/).at(-1)?.[0] ?? "?").toUpperCase();
}

const roundButton =
  "grid size-10 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-muted hover:text-primary";

function Logo({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 text-lg font-bold text-primary"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <CodeXml className="size-5" aria-hidden />
      </span>
      Code Carf
    </Link>
  );
}

export function AppShell({
  userName,
  sidebarCollapsed = false,
  role = RoleName.STUDENT,
  children,
}: {
  userName: string;
  sidebarCollapsed?: boolean;
  role?: RoleName;
  children: React.ReactNode;
}) {
  const teacherMode = isTeacherRole(role);
  const canViewProfile = allowedRole("/hv/profile", role);
  const homeHref = teacherMode ? "/gv" : "/hv/dashboard";
  const today = new Intl.DateTimeFormat("vi-VN", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const firstName = userName.trim().split(/\s+/).at(-1) ?? userName;

  return (
    <div className="min-h-dvh bg-muted/40 lg:flex">
      <Sidebar
        userName={userName}
        initialCollapsed={sidebarCollapsed}
        role={role}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
            <MobileSidebar role={role} />
            <div className="min-w-0 lg:hidden">
              <Logo href={homeHref} />
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-base font-semibold">
                Xin chào, {firstName}
              </p>
              <p className="text-xs text-muted-foreground first-letter:uppercase">
                {today}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <label className="relative mr-1 hidden md:block">
                <span className="sr-only">Tìm kiếm</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder="Tìm bài học, cuộc thi..."
                  className="h-10 w-72 rounded-full border border-border/80 bg-muted/50 pr-4 pl-10 text-sm transition-[box-shadow,background-color] placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-none"
                />
              </label>
              <button
                type="button"
                aria-label="Thông báo"
                className={`relative ${roundButton}`}
              >
                <Bell className="size-5" aria-hidden />
                <span className="absolute top-2 right-2.5 size-2 rounded-full bg-accent ring-2 ring-background" />
              </button>
              <Link
                href={teacherMode ? "/gv/paths" : "/hv/paths"}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {teacherMode ? (
                  <>
                    <BookOpen className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Lộ trình học</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Lộ trình mới</span>
                  </>
                )}
              </Link>

              {/* Account menu on small screens; desktop uses the sidebar footer */}
              <details className="relative lg:hidden">
                <summary
                  aria-label={`Tài khoản ${userName}`}
                  className="grid size-10 cursor-pointer list-none place-items-center rounded-full bg-secondary/60 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden"
                >
                  {initials(userName)}
                </summary>
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-border/70 bg-background p-2 shadow-xl">
                  <p className="truncate px-3 py-2 text-sm font-semibold">
                    {userName}
                  </p>
                  <Link
                    href={
                      teacherMode
                        ? "/gv"
                        : canViewProfile
                          ? "/hv/profile"
                          : "/grading"
                    }
                    className="block rounded-xl px-3 py-2 text-sm hover:bg-muted"
                  >
                    {teacherMode
                      ? "Không gian giảng viên"
                      : canViewProfile
                        ? "Hồ sơ của tôi"
                        : "Khu vực chấm bài"}
                  </Link>
                  <Link
                    href="/settings"
                    className="block rounded-xl px-3 py-2 text-sm hover:bg-muted"
                  >
                    Cài đặt tài khoản
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5"
                    >
                      <LogOut className="size-4" aria-hidden />
                      Đăng xuất
                    </button>
                  </form>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
