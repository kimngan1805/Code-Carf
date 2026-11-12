import { SiteHeader } from "@/components/site-header";
import { FeatureStrip } from "@/features/landing/components/feature-strip";
import { Hero } from "@/features/landing/components/hero";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <FeatureStrip />
      </main>
    </>
  );
}
