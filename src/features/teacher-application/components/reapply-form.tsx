"use client";

import { useRouter } from "next/navigation";
import { TeacherApplicationForm } from "./teacher-application-form";

export function ReapplyForm() {
  const router = useRouter();
  return (
    <TeacherApplicationForm
      onBack={() => router.replace("/onboarding/teacher/submitted")}
    />
  );
}
