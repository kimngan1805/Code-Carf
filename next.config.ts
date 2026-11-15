import type { NextConfig } from "next";

/** Old role-less URLs, kept so bookmarks and older links still work. */
const movedRoutes = [
  ["/dashboard", "/hv/dashboard"],
  ["/paths", "/hv/paths"],
  ["/rooms", "/hv/rooms"],
  ["/achievements", "/hv/achievements"],
  ["/profile", "/hv/profile"],
  ["/creator", "/gv"],
] as const;

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return movedRoutes.flatMap(([from, to]) => [
      { source: from, destination: to, permanent: false },
      {
        source: `${from}/:path*`,
        destination: `${to}/:path*`,
        permanent: false,
      },
    ]);
  },
};
export default nextConfig;
