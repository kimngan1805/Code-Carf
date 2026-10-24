import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  ProfileBadgesSection,
  ProfileHeaderCard,
  ProfileOverviewStats,
  ProfilePathsSection,
} from "@/features/profile/components/profile-sections";
import { getPublicProfile } from "@/features/profile/service";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Hồ sơ học viên · Code Carf",
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const callbackUrl = encodeURIComponent(`/u/${id}`);

  const { profile, isOwnProfile } = await getPublicProfile(id).catch(
    (error) => {
      if (error instanceof AppError) {
        if (error.status === 401) redirect(`/login?callbackUrl=${callbackUrl}`);
        if (error.status === 403) redirect("/forbidden");
        if (error.status === 404) notFound();
      }
      throw error;
    },
  );

  return (
    <div className="space-y-6">
      <ProfileHeaderCard
        profile={profile}
        mode="public"
        isOwnPublicView={isOwnProfile}
      />
      <ProfileOverviewStats profile={profile} />
      <ProfilePathsSection paths={profile.paths} isOwner={false} />
      <ProfileBadgesSection badges={profile.badges} isOwner={false} />
    </div>
  );
}
