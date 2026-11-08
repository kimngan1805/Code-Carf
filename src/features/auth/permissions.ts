import { RoleName } from "@prisma/client";

export { RoleName };

export const routeRoles: Record<string, RoleName[]> = {
  "/hv/dashboard": Object.values(RoleName),
  "/onboarding": Object.values(RoleName),
  "/settings": Object.values(RoleName),
  "/hv/achievements": [RoleName.STUDENT],
  "/hv/profile": [RoleName.STUDENT],
  "/leaderboard": [RoleName.STUDENT],
  "/u": Object.values(RoleName),
  "/hv/paths": [RoleName.STUDENT, RoleName.TEACHER, RoleName.ADMIN],
  "/hv/rooms": [RoleName.STUDENT, RoleName.TEACHER, RoleName.ADMIN],
  "/hv/exercises": [RoleName.STUDENT],
  "/contests": [
    RoleName.STUDENT,
    RoleName.TEACHER,
    RoleName.GRADER,
    RoleName.ADMIN,
  ],
  "/gv": [RoleName.TEACHER, RoleName.ADMIN],
  "/grading": [RoleName.GRADER, RoleName.ADMIN],
  "/admin": [RoleName.ADMIN],
};

export function allowedRole(pathname: string, role?: RoleName): boolean {
  const entry = Object.entries(routeRoles).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return !entry || Boolean(role && entry[1].includes(role));
}

export function isTeacherRole(role?: RoleName): boolean {
  return role === RoleName.TEACHER || role === RoleName.ADMIN;
}
