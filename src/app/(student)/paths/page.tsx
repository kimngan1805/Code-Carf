import { PathList } from "@/features/paths/components/path-list";
import { getPaths } from "@/features/paths/service";
import { getCurrentUser } from "@/features/auth/service";
import { isTeacherRole } from "@/features/auth/permissions";
import { redirect } from "next/navigation";
export default async function PathsPage() {
  const user = await getCurrentUser();
  if (user && isTeacherRole(user.role.name)) redirect("/creator/paths");
  const paths = await getPaths();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Lộ trình học</h1>
      <PathList paths={paths} />
    </div>
  );
}
