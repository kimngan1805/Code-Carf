import { PublicSiteLayout } from "@/components/public-site-layout";

export default function RankingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicSiteLayout>{children}</PublicSiteLayout>;
}
