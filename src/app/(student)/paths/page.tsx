import { PathList } from "@/features/paths/components/path-list";
import { getPaths } from "@/features/paths/service";
export default async function PathsPage() {
  const paths = await getPaths();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Learning paths</h1>
      <PathList paths={paths} />
    </div>
  );
}
