import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Email không hợp lệ"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Tên cần ít nhất 2 ký tự")
      .max(60, "Tên tối đa 60 ký tự"),
    email,
    // bcrypt only uses the first 72 bytes of a password.
    password: z
      .string()
      .min(8, "Mật khẩu cần ít nhất 8 ký tự")
      .max(72, "Mật khẩu tối đa 72 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại không khớp",
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function firstFieldErrors<T extends string>(
  error: z.ZodError,
): FieldErrors<T> {
  const result: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as T;
    result[field] ??= issue.message;
  }
  return result;
}
