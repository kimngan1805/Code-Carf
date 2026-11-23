import Link from "next/link";
export function ReportPagination({
  page,
  pages,
  base,
  status,
}: {
  page: number;
  pages: number;
  base: string;
  status?: string;
}) {
  const href = (number: number) =>
    `${base}?${new URLSearchParams({ page: String(number), ...(status ? { status } : {}) })}`;
  return (
    <nav
      aria-label="Phân trang báo lỗi"
      className="flex flex-wrap items-center gap-4 text-sm"
    >
      {page > 1 && (
        <Link
          className="font-medium text-primary underline"
          href={href(page - 1)}
        >
          Trang trước
        </Link>
      )}
      <span>
        Trang {page} / {pages}
      </span>
      {page < pages && (
        <Link
          className="font-medium text-primary underline"
          href={href(page + 1)}
        >
          Trang sau
        </Link>
      )}
    </nav>
  );
}
