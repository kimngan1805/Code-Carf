import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalStorage, createSupabaseStorage } from "./storage";

const KEY = "teacher-applications/user-1/file-1.png";

describe("supabase storage", () => {
  function setup(response: Response = new Response(null, { status: 200 })) {
    const fetchFn = vi.fn().mockResolvedValue(response);
    const storage = createSupabaseStorage({
      url: "https://proj.supabase.co/",
      serviceKey: "service-key",
      bucket: "docs",
      fetchFn,
    });
    return { fetchFn, storage };
  }

  it("uploads without overwriting and sends the service key", async () => {
    const { fetchFn, storage } = setup();
    await storage.put(KEY, Buffer.from([1, 2]));
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`https://proj.supabase.co/storage/v1/object/docs/${KEY}`);
    expect(init.method).toBe("POST");
    expect(init.headers["x-upsert"]).toBe("false");
    expect(init.headers.Authorization).toBe("Bearer service-key");
  });

  it("downloads from the authenticated endpoint", async () => {
    const { fetchFn, storage } = setup(new Response(new Uint8Array([9, 8])));
    const bytes = await storage.get(KEY);
    expect([...bytes]).toEqual([9, 8]);
    expect(fetchFn.mock.calls[0][0]).toContain(
      `/object/authenticated/docs/${KEY}`,
    );
  });

  it("deletes by prefix", async () => {
    const { fetchFn, storage } = setup();
    await storage.delete(KEY);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://proj.supabase.co/storage/v1/object/docs");
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(init.body)).toEqual({ prefixes: [KEY] });
  });

  it("throws when the service answers with an error", async () => {
    const { storage } = setup(new Response("nope", { status: 403 }));
    await expect(storage.get(KEY)).rejects.toThrow("403");
  });

  it("refuses keys that could escape the bucket path", async () => {
    const { fetchFn, storage } = setup();
    await expect(storage.get("../secret.png")).rejects.toThrow(
      "Invalid storage key",
    );
    await expect(storage.put("a//b.png", Buffer.alloc(1))).rejects.toThrow();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("local storage", () => {
  let dir: string | undefined;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("round-trips a file and refuses to overwrite it", async () => {
    dir = await mkdtemp(join(tmpdir(), "storage-"));
    const storage = createLocalStorage(dir);
    await storage.put(KEY, Buffer.from("hello"));
    expect((await storage.get(KEY)).toString()).toBe("hello");
    await expect(storage.put(KEY, Buffer.from("x"))).rejects.toThrow();
    await storage.delete(KEY);
    await expect(readFile(join(dir, KEY))).rejects.toThrow();
  });

  it("refuses path traversal", async () => {
    dir = await mkdtemp(join(tmpdir(), "storage-"));
    await expect(
      createLocalStorage(dir).get("../../etc/passwd.txt"),
    ).rejects.toThrow("Invalid storage key");
  });
});
