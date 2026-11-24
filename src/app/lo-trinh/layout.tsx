import { PublicSiteLayout } from "@/components/public-site-layout";

export default function PathShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicSiteLayout>{children}</PublicSiteLayout>;
}
