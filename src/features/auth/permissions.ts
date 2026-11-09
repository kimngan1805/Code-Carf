import { RoleName } from "@prisma/client";

export const routeRoles: Record<string, RoleName[]> = {
  "/paths": [RoleName.STUDENT, RoleName.TEACHER, RoleName.ADMIN],
  "/rooms": [RoleName.STUDENT, RoleName.TEACHER, RoleName.ADMIN],
  "/contests": [
    RoleName.STUDENT,
    RoleName.TEACHER,
    RoleName.GRADER,
    RoleName.ADMIN,
  ],
  "/creator": [RoleName.TEACHER, RoleName.ADMIN],
  "/grading": [RoleName.GRADER, RoleName.ADMIN],
  "/admin": [RoleName.ADMIN],
};

export function allowedRole(pathname: string, role?: RoleName): boolean {
  const entry = Object.entries(routeRoles).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return !entry || Boolean(role && entry[1].includes(role));
}
