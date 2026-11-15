import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  current: vi.fn(),
  find: vi.fn(),
  session: vi.fn(),
  latest: vi.fn(),
  open: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/auth", () => ({ auth: mocks.session }));
vi.mock("@/features/auth/service", () => ({ getCurrentUser: mocks.current }));
vi.mock("@/features/auth/repository", () => ({ findUserWithRole: mocks.find }));
vi.mock("@/features/teacher-application/repository", () => ({
  findLatestApplication: mocks.latest,
  findOpenApplication: mocks.open,
}));
vi.mock("@/features/onboarding/components/onboarding-wizard", () => ({
  OnboardingWizard: () => null,
}));
vi.mock("@/features/teacher-application/components/reapply-form", () => ({
  ReapplyForm: () => null,
}));
vi.mock("@/features/auth/components/login-form", () => ({
  LoginForm: () => null,
}));
vi.mock("@/features/auth/components/auth-shell", () => ({
  AuthShell: () => null,
}));

import LoginPage from "@/app/login/page";
import OnboardingPage from "@/app/onboarding/page";
import SubmittedPage from "@/app/onboarding/teacher/submitted/page";
import ApplyPage from "@/app/onboarding/teacher/apply/page";

function user(role: string, onboardedAt: Date | null = new Date()) {
  const value = {
    id: "user-1",
    name: "Quang",
    role: { name: role },
    onboardedAt,
  };
  mocks.current.mockResolvedValue(value);
  mocks.find.mockResolvedValue(value);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "user-1" } });
  mocks.latest.mockResolvedValue(null);
  mocks.open.mockResolvedValue(null);
  user("GUEST");
});

it("terminates the orphan guest login/onboarding loop at the application form", async () => {
  await expect(
    LoginPage({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow("REDIRECT:/onboarding/teacher/submitted");
  await expect(OnboardingPage()).rejects.toThrow(
    "REDIRECT:/onboarding/teacher/submitted",
  );
  await expect(SubmittedPage()).rejects.toThrow(
    "REDIRECT:/onboarding/teacher/apply",
  );
  await expect(ApplyPage()).resolves.toBeTruthy();
});
it.each(["TEACHER", "ADMIN"])(
  "sends %s directly to the teaching area even without an application",
  async (role) => {
    user(role);
    await expect(
      LoginPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/gv");
    await expect(SubmittedPage()).rejects.toThrow("REDIRECT:/onboarding");
    await expect(OnboardingPage()).rejects.toThrow("REDIRECT:/gv");
  },
);
it("preserves student onboarding and completed dashboard navigation", async () => {
  user("STUDENT", null);
  await expect(OnboardingPage()).resolves.toBeTruthy();
  user("STUDENT");
  await expect(OnboardingPage()).rejects.toThrow("REDIRECT:/hv/dashboard");
  await expect(
    LoginPage({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow("REDIRECT:/hv/dashboard");
});
it("renders the login form for anonymous or deleted-account sessions", async () => {
  mocks.current.mockResolvedValue(null);
  await expect(
    LoginPage({ searchParams: Promise.resolve({}) }),
  ).resolves.toBeTruthy();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it("keeps an existing pending application on its status page", async () => {
  mocks.latest.mockResolvedValue({
    status: "PENDING",
    teachingLevel: "UNIVERSITY",
    createdAt: new Date(),
    _count: { documents: 1 },
  });
  await expect(SubmittedPage()).resolves.toBeTruthy();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
