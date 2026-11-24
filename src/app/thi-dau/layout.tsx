import { PublicSiteLayout } from "@/components/public-site-layout";

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicSiteLayout>{children}</PublicSiteLayout>;
}
