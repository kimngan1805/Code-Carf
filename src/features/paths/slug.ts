export function pathSlug(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  // /gv/paths/new is the creation screen, not a path detail URL.
  return slug === "new" ? "lo-trinh-new" : slug || "lo-trinh";
}
