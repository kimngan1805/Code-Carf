import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-2xl font-bold">Đăng nhập</h1>
      {error && (
        <p role="alert" className="mt-4 text-destructive">
          Email hoặc mật khẩu không đúng.
        </p>
      )}
      <form
        className="mt-6 space-y-4"
        action={async (formData) => {
          "use server";
          try {
            await signIn("credentials", formData);
          } catch (error) {
            if (error instanceof AuthError)
              redirect("/login?error=credentials");
            throw error;
          }
        }}
      >
        <label className="block">
          Email
          <input
            className="mt-1 w-full rounded-md border border-input p-2"
            name="email"
            type="email"
            required
          />
        </label>
        <label className="block">
          Mật khẩu
          <input
            className="mt-1 w-full rounded-md border border-input p-2"
            name="password"
            type="password"
            required
          />
        </label>
        <Button type="submit">Đăng nhập</Button>
      </form>
    </main>
  );
}
