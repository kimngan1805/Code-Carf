import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/features/auth/actions", () => ({ logoutAction: vi.fn() }));
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/features/landing/components/hero";
import { ShowcaseContestCard, ShowcaseHero } from "./contest-kinds";
import { ShowcaseGallery } from "./showcase-gallery";
import { ContestDetailAside } from "./contest-detail";
import { withProfile } from "../catalog";
import type { PublicContest } from "../service";

const contest: PublicContest = {
  slug: "public-event",
  title: "Sample Contest",
  description: "<script>alert('unsafe')</script>",
  phase: "upcoming",
  registrationPhase: "live",
  registrationOpensAt: "2026-11-16T00:00:00.000Z",
  registrationClosesAt: "2026-11-17T00:00:00.000Z",
  examStartsAt: "2026-11-18T00:00:00.000Z",
  examEndsAt: "2026-11-18T02:00:00.000Z",
  durationMinutes: 60,
  exercises: 2,
  participants: 1,
};
it("links desktop/mobile landing navigation and hero to the public showcase", () => {
  const html = renderToStaticMarkup(
    <>
      <SiteHeader />
      <Hero />
    </>,
  );
  expect(html.match(/href="\/thi-dau"/g)).toHaveLength(3);
  expect(html).not.toContain('href="/contests"');
});
it("links contest cards to public introductions and escapes authored descriptions", () => {
  const html = renderToStaticMarkup(
    <>
      <ShowcaseHero featured={withProfile(contest)} />
      <ShowcaseContestCard contest={withProfile(contest)} />
    </>,
  );
  expect(html).toContain('href="/thi-dau/public-event"');
  expect(html).not.toContain('href="/contests');
  expect(html).not.toContain("<script>");
  expect(html).toContain("Sắp diễn ra");
  expect(html).toContain("Nhiệm vụ cá nhân");
});
it("shows an informative empty gallery rather than a login prompt", () => {
  const html = renderToStaticMarkup(<ShowcaseGallery contests={[]} />);
  expect(html).toContain("Thử thách mới đang được chuẩn bị");
  expect(html).not.toContain('href="/login"');
});
it("sends registration to the student contest page, guarded by login", () => {
  const html = renderToStaticMarkup(
    <ContestDetailAside contest={withProfile(contest)} />,
  );
  expect(html).toContain('href="/contests/public-event"');
  expect(html).toContain("Đăng ký tham gia");
});
it("sends a sample that is not in the database to the real contest list", () => {
  const sample = { ...withProfile(contest), sample: true };
  const html = renderToStaticMarkup(<ContestDetailAside contest={sample} />);
  expect(html).toContain('href="/contests"');
  expect(html).not.toContain("aria-pressed");
});
