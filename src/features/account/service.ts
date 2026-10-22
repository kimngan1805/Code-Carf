import { RoleName } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/features/auth/schemas";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { updateUserName, updateUserPasswordHash } from "./repository";

export interface AccountSettingsData {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  createdAt: Date;
}

export async function getAccountSettings(): Promise<AccountSettingsData> {
  const user = await requireRole(Object.values(RoleName));
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    createdAt: user.createdAt,
  };
}

export async function updateDisplayName(input: UpdateProfileInput) {
  const user = await requireRole(Object.values(RoleName));
  const parsed = updateProfileSchema.parse(input);
  return updateUserName(user.id, parsed.name);
}

export async function changePassword(input: ChangePasswordInput) {
  const user = await requireRole(Object.values(RoleName));
  const parsed = changePasswordSchema.parse(input);
  const matches = await compare(parsed.currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError(
      400,
      "INVALID_CURRENT_PASSWORD",
      "Mật khẩu hiện tại không đúng",
    );
  }
  const passwordHash = await hash(parsed.newPassword, 12);
  await updateUserPasswordHash(user.id, passwordHash);
  return { updated: true };
}
