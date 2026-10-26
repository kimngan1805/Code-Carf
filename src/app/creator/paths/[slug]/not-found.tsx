import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        Không tìm thấy nội dung bạn được quản lý
      </h1>
      <Link href="/creator/paths" className="text-primary hover:underline">
        Về quản lý lộ trình
      </Link>
    </div>
  );
}
