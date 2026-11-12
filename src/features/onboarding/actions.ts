"use server";

import { RoleName } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/service";
import { studentOnboardingSchema } from "./questions";
import { saveStudentOnboarding } from "./repository";

export interface OnboardingState {
  error?: string;
}

export async function completeStudentOnboarding(
  _state: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireRole(Object.values(RoleName));
  if (user.onboardedAt) redirect("/dashboard");

  const parsed = studentOnboardingSchema.safeParse({
    level: formData.get("level"),
    goal: formData.get("goal"),
    languages: formData.getAll("languages"),
    dailyMinutes: formData.get("dailyMinutes"),
  });
  if (!parsed.success)
    return { error: "Bạn trả lời giúp mình đủ các câu hỏi nhé." };

  try {
    await saveStudentOnboarding(user.id, parsed.data);
  } catch (error) {
    console.error(error);
    return { error: "Không lưu được câu trả lời, vui lòng thử lại." };
  }
  redirect("/dashboard");
}
