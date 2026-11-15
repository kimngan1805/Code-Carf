import { db } from "@/lib/db";

/**
 * True only when a database really answers. Integration tests use this to decide whether to
 * run: a `DATABASE_URL` that merely exists is not enough, because CI sets a placeholder.
 * Usage: `const hasDatabase = await canConnectToDatabase();` then `describe.skipIf(!hasDatabase)(...)`.
 */
export async function canConnectToDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await db.$queryRawUnsafe("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
