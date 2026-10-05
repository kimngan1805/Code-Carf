import { RoleName } from "@prisma/client";
import { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: RoleName;
  }
  interface Session {
    user: { id: string; role: RoleName } & DefaultSession["user"];
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: RoleName;
  }
}
