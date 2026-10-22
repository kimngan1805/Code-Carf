import { RoleName } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changePasswordSchema,
  registerSchema,
  updateProfileSchema,
} from "@/features/auth/schemas";
import { AppError } from "@/lib/errors";

const {
  requireRoleMock,
  updateUserNameMock,
  updateUserPasswordHashMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  updateUserNameMock: vi.fn(),
  updateUserPasswordHashMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("./repository", () => ({
  updateUserName: updateUserNameMock,
  updateUserPasswordHash: updateUserPasswordHashMock,
}));

import { changePasswordAction, updateDisplayNameAction } from "./actions";
import {
  changePassword,
  getAccountSettings,
  updateDisplayName,
} from "./service";

describe("account validation schemas", () => {
  it("trims and validates display name between 2 and 60 characters", () => {
    expect(updateProfileSchema.parse({ name: "  Minh Thư  " })).toEqual({
      name: "Minh Thư",
    });
    expect(updateProfileSchema.safeParse({ name: " A " }).success).toBe(false);
    expect(
      updateProfileSchema.safeParse({ name: "a".repeat(61) }).success,
    ).toBe(false);
  });

  it("enforces password length, 72-byte bcrypt limit, confirmation match, and difference from current password", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "",
        newPassword: "NewPassword123!",
        confirmNewPassword: "NewPassword123!",
      }).success,
    ).toBe(false);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "short",
        confirmNewPassword: "short",
      }).success,
    ).toBe(false);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "a".repeat(73),
        confirmNewPassword: "a".repeat(73),
      }).success,
    ).toBe(false);

    // 30 Vietnamese characters 'ă' (2 bytes each) + 20 'ệ' (3 bytes each) = 50 chars but 120 UTF-8 bytes (> 72 bytes)
    const multibyteOver72Bytes = "ă".repeat(30) + "ệ".repeat(20);
    expect(multibyteOver72Bytes.length).toBeLessThanOrEqual(72);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: multibyteOver72Bytes,
        confirmNewPassword: multibyteOver72Bytes,
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Minh Thư",
        email: "student@local.test",
        password: multibyteOver72Bytes,
        confirmPassword: multibyteOver72Bytes,
      }).success,
    ).toBe(false);

    const mismatch = changePasswordSchema.safeParse({
      currentPassword: "OldPassword123!",
      newPassword: "NewPassword123!",
      confirmNewPassword: "DifferentPassword123!",
    });
    expect(mismatch.success).toBe(false);

    const sameAsCurrent = changePasswordSchema.safeParse({
      currentPassword: "SamePassword123!",
      newPassword: "SamePassword123!",
      confirmNewPassword: "SamePassword123!",
    });
    expect(sameAsCurrent.success).toBe(false);
  });
});

describe("account service and actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns safe account settings without passwordHash for signed-in user", async () => {
    const createdAt = new Date("2026-04-01T00:00:00.000Z");
    requireRoleMock.mockResolvedValue({
      id: "user-1",
      name: "Minh Thư",
      email: "student@local.test",
      passwordHash: "$2b$12$secret",
      createdAt,
      role: { name: RoleName.STUDENT },
    });

    const settings = await getAccountSettings();

    expect(requireRoleMock).toHaveBeenCalledWith(Object.values(RoleName));
    expect(settings).toEqual({
      id: "user-1",
      name: "Minh Thư",
      email: "student@local.test",
      role: RoleName.STUDENT,
      createdAt,
    });
    expect("passwordHash" in settings).toBe(false);
  });

  it("rejects unauthenticated callers before touching repository", async () => {
    requireRoleMock.mockRejectedValue(
      new AppError(401, "UNAUTHORIZED", "Sign in required"),
    );

    await expect(updateDisplayName({ name: "Tên Mới" })).rejects.toMatchObject({
      status: 401,
    });
    expect(updateUserNameMock).not.toHaveBeenCalled();
  });

  it("updates display name for the session user and revalidates root layout so Header updates immediately", async () => {
    requireRoleMock.mockResolvedValue({
      id: "user-student-1",
      name: "Minh Thư",
      email: "student@local.test",
      role: { name: RoleName.STUDENT },
    });
    updateUserNameMock.mockResolvedValue({
      id: "user-student-1",
      name: "Nguyễn Minh Thư",
      email: "student@local.test",
    });

    const formData = new FormData();
    formData.set("name", "  Nguyễn Minh Thư  ");

    const state = await updateDisplayNameAction({}, formData);

    expect(updateUserNameMock).toHaveBeenCalledWith(
      "user-student-1",
      "Nguyễn Minh Thư",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
    expect(state.success).toBe("Đã cập nhật tên hiển thị.");
    expect(state.values).toEqual({ name: "Nguyễn Minh Thư" });
  });

  it("rejects password change when current password is wrong and never calls updateUserPasswordHash", async () => {
    const currentHash = await hash("CurrentPass123!", 4);
    requireRoleMock.mockResolvedValue({
      id: "user-1",
      name: "Minh Thư",
      email: "student@local.test",
      passwordHash: currentHash,
      role: { name: RoleName.STUDENT },
    });

    await expect(
      changePassword({
        currentPassword: "WrongCurrentPassword!",
        newPassword: "BrandNewPass123!",
        confirmNewPassword: "BrandNewPass123!",
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: "INVALID_CURRENT_PASSWORD",
    });

    expect(updateUserPasswordHashMock).not.toHaveBeenCalled();
  });

  it("verifies current password, hashes new password with bcrypt so login with new password succeeds, and never leaks secrets in action state", async () => {
    const oldPassword = "OldPassword123!";
    const newPassword = "NewSecurePassword456!";
    const oldHash = await hash(oldPassword, 4);

    requireRoleMock.mockResolvedValue({
      id: "user-1",
      name: "Minh Thư",
      email: "student@local.test",
      passwordHash: oldHash,
      role: { name: RoleName.STUDENT },
    });

    let savedHash = "";
    updateUserPasswordHashMock.mockImplementation(
      async (_userId: string, passwordHash: string) => {
        savedHash = passwordHash;
        return { id: "user-1" };
      },
    );

    const formData = new FormData();
    formData.set("currentPassword", oldPassword);
    formData.set("newPassword", newPassword);
    formData.set("confirmNewPassword", newPassword);

    const state = await changePasswordAction({}, formData);

    expect(state.success).toBe("Đã cập nhật mật khẩu thành công.");
    expect(JSON.stringify(state)).not.toContain(oldPassword);
    expect(JSON.stringify(state)).not.toContain(newPassword);
    expect(JSON.stringify(state)).not.toContain(savedHash);

    expect(updateUserPasswordHashMock).toHaveBeenCalledTimes(1);
    expect(updateUserPasswordHashMock.mock.calls[0]?.[0]).toBe("user-1");
    expect(await compare(newPassword, savedHash)).toBe(true);
    expect(await compare(oldPassword, savedHash)).toBe(false);
  });
});
