import Link from "next/link";
import { getAdminSummary } from "@/features/admin/service";
export default async function AdminPage() {
  const summary = await getAdminSummary();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p>Users: {summary.users}</p>
      <Link href="/admin/teacher-applications" className="underline">
        Duyệt hồ sơ giảng viên
      </Link>
    </main>
  );
}
