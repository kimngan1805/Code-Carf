import { PathList } from "@/features/paths/components/path-list";
import { getPaths } from "@/features/paths/service";
export default async function PathsPage() {
  const paths = await getPaths();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Learning paths</h1>
      <PathList paths={paths} />
    </main>
  );
}
