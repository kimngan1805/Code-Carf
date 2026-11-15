import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { allowedRole } from "@/features/auth/permissions";

export const proxy = auth((request) => {
  const path = request.nextUrl.pathname;
  if (!request.auth?.user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (!allowedRole(path, request.auth.user.role))
    return NextResponse.redirect(new URL("/forbidden", request.url));
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/hv/search/:path*",
    "/hv/dashboard/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
    "/hv/achievements/:path*",
    "/hv/profile/:path*",
    "/leaderboard/:path*",
    "/u/:path*",
    "/hv/paths/:path*",
    "/hv/rooms/:path*",
    "/hv/exercises/:path*",
    "/hv/submissions/:path*",
    "/contests/:path*",
    "/gv/:path*",
    "/grading/:path*",
    "/admin/:path*",
  ],
};
