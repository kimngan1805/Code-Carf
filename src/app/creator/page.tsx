import { routeRoles } from "@/features/auth/permissions";
import { requireRole } from "@/features/auth/service";
export default async function CreatorPage() {
  const user = await requireRole(routeRoles["/creator"]);
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Creator workspace</h1>
      <p>Welcome, {user.name}</p>
    </main>
  );
}
