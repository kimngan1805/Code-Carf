import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
export default async function CreatorPage() {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Creator workspace</h1>
      <p>Welcome, {user.name}</p>
    </main>
  );
}
