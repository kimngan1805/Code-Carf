import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  ProfileBadgesSection,
  ProfileHeaderCard,
  ProfileOverviewStats,
  ProfilePathsSection,
  ProfileSubmissionsSection,
} from "@/features/profile/components/profile-sections";
import { getOwnProfile } from "@/features/profile/service";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Hồ sơ cá nhân · Code Carf",
};

export default async function ProfilePage() {
  const profile = await getOwnProfile().catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/profile");
      if (error.status === 403) redirect("/forbidden");
      if (error.status === 404) notFound();
    }
    throw error;
  });

  return (
    <div className="space-y-6">
      <ProfileHeaderCard profile={profile} email={profile.email} mode="own" />
      <ProfileOverviewStats profile={profile} />
      <ProfilePathsSection paths={profile.paths} isOwner />
      <ProfileBadgesSection badges={profile.badges} isOwner />
      <ProfileSubmissionsSection submissions={profile.submissions} />
    </div>
  );
}
