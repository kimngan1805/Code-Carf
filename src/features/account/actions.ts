"use server";

import { revalidatePath } from "next/cache";
import {
  changePasswordSchema,
  firstFieldErrors,
  updateProfileSchema,
  type FieldErrors,
} from "@/features/auth/schemas";
import { AppError } from "@/lib/errors";
import { changePassword, updateDisplayName } from "./service";

export interface UpdateProfileState {
  errors?: FieldErrors<"name">;
  formError?: string;
  success?: string;
  values?: { name: string };
  updatedAt?: number;
}

export interface ChangePasswordState {
  errors?: FieldErrors<
    "currentPassword" | "newPassword" | "confirmNewPassword"
  >;
  formError?: string;
  success?: string;
  updatedAt?: number;
}

export async function updateDisplayNameAction(
  _state: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const name = String(formData.get("name") ?? "");
  const parsed = updateProfileSchema.safeParse({ name });
  if (!parsed.success) {
    return {
      errors: firstFieldErrors(parsed.error),
      values: { name },
    };
  }

  try {
    const updated = await updateDisplayName(parsed.data);
    revalidatePath("/", "layout");
    return {
      success: "Đã cập nhật tên hiển thị.",
      values: { name: updated.name },
      updatedAt: Date.now(),
    };
  } catch (error) {
    if (error instanceof AppError && [401, 403].includes(error.status)) {
      return {
        formError: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
        values: { name },
      };
    }
    return {
      formError: "Không thể cập nhật tên hiển thị, vui lòng thử lại.",
      values: { name },
    };
  }
}

export async function changePasswordAction(
  _state: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const raw = {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmNewPassword: String(formData.get("confirmNewPassword") ?? ""),
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await changePassword(parsed.data);
    return {
      success: "Đã cập nhật mật khẩu thành công.",
      updatedAt: Date.now(),
    };
  } catch (error) {
    if (
      error instanceof AppError &&
      error.code === "INVALID_CURRENT_PASSWORD"
    ) {
      return {
        errors: { currentPassword: error.message },
      };
    }
    if (error instanceof AppError && [401, 403].includes(error.status)) {
      return {
        formError: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      };
    }
    return {
      formError: "Không thể cập nhật mật khẩu, vui lòng thử lại.",
    };
  }
}
