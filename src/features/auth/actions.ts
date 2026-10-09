"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { AppError } from "@/lib/errors";
import { AFTER_LOGIN_PATH } from "./constants";
import {
  firstFieldErrors,
  loginSchema,
  registerSchema,
  type FieldErrors,
} from "./schemas";
import { registerUser } from "./service";

export interface LoginState {
  error?: string;
  email?: string;
}

export interface RegisterState {
  errors?: FieldErrors<"name" | "email" | "password" | "confirmPassword">;
  formError?: string;
  values?: { name: string; email: string };
}

/** Only allow same-site relative paths, so callbackUrl cannot redirect off-site. */
function safeRedirect(value: FormDataEntryValue | null) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : AFTER_LOGIN_PATH;
}

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success)
    return { error: "Vui lòng nhập email và mật khẩu hợp lệ.", email };
  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeRedirect(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError)
      return { error: "Email hoặc mật khẩu không đúng.", email };
    throw error; // includes Next.js redirect
  }
  return {};
}

export async function registerAction(
  _state: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const values = { name: raw.name, email: raw.email };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success)
    return { errors: firstFieldErrors(parsed.error), values };
  try {
    await registerUser(parsed.data);
  } catch (error) {
    if (error instanceof AppError && error.code === "EMAIL_TAKEN")
      return { errors: { email: error.message }, values };
    console.error(error);
    return { formError: "Không thể tạo tài khoản, vui lòng thử lại.", values };
  }
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: AFTER_LOGIN_PATH,
  });
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
