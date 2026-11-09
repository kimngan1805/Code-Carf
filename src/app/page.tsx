import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Code Carf</h1>
      <p className="mt-4">Nền tảng học và thi lập trình.</p>
      <Link className="mt-6 inline-block underline" href="/login">
        Đăng nhập
      </Link>
    </main>
  );
}
