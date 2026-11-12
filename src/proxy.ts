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
    "/dashboard/:path*",
    "/paths/:path*",
    "/rooms/:path*",
    "/contests/:path*",
    "/creator/:path*",
    "/grading/:path*",
    "/admin/:path*",
  ],
};
