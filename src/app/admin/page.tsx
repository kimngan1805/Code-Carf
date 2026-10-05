import { getAdminSummary } from "@/features/admin/service";
export default async function AdminPage() {
  const summary = await getAdminSummary();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p>Users: {summary.users}</p>
    </main>
  );
}
