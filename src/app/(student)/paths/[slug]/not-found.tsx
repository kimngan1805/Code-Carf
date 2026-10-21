import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Không tìm thấy lộ trình</h1>
      <Link href="/paths" className="text-primary hover:underline">
        Về danh sách lộ trình
      </Link>
    </div>
  );
}
