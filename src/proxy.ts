import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { allowedRole } from "@/features/auth/permissions";

export const proxy = auth((request) => {
  const path = request.nextUrl.pathname;
  if (!request.auth?.user)
    return NextResponse.redirect(new URL("/login", request.url));
  if (!allowedRole(path, request.auth.user.role))
    return NextResponse.redirect(new URL("/forbidden", request.url));
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/paths/:path*",
    "/rooms/:path*",
    "/contests/:path*",
    "/creator/:path*",
    "/grading/:path*",
    "/admin/:path*",
  ],
};
