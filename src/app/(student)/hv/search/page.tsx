import Link from "next/link";
import { SearchForm } from "@/features/search/components/search-form";
import { searchLearningContent } from "@/features/search/service";
import { SEARCH_GROUP_LIMIT, SEARCH_MAX_LENGTH } from "@/features/search/query";

export const metadata = { title: "Tìm kiếm | Code Carf" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const results = await searchLearningContent(query);
  const groups = [
    {
      label: "Lộ trình",
      items: results.paths.map((item) => ({
        ...item,
        href: `/hv/paths/${encodeURIComponent(item.slug)}`,
      })),
    },
    {
      label: "Bài học",
      items: results.rooms.map((item) => ({
        ...item,
        href: `/hv/rooms/${encodeURIComponent(item.id)}`,
      })),
    },
    {
      label: "Cuộc thi",
      items: results.contests.map((item) => ({
        ...item,
        href: `/contests/${encodeURIComponent(item.slug)}`,
      })),
    },
  ];
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-primary">Tìm kiếm</h1>
      <SearchForm key={query} defaultValue={query} />
      {results.tooLong ? (
        <p role="status">Vui lòng nhập tối đa {SEARCH_MAX_LENGTH} ký tự.</p>
      ) : !results.query ? (
        <p role="status" className="text-muted-foreground">
          Nhập tên lộ trình, bài học hoặc cuộc thi để tìm kiếm.
        </p>
      ) : count === 0 ? (
        <p role="status">
          Không có kết quả cho “{results.query}”. Hãy thử từ khóa khác.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Kết quả cho “{results.query}” · Tối đa {SEARCH_GROUP_LIMIT} kết quả
            mỗi nhóm.
          </p>
          {groups.map((group) => (
            <section
              key={group.label}
              aria-label={group.label}
              className="space-y-3"
            >
              <h2 className="text-lg font-semibold">
                {group.label} ({group.items.length})
              </h2>
              {group.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Không có kết quả trong nhóm này.
                </p>
              ) : (
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="block rounded-xl border bg-background p-4 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="block font-medium break-words text-primary">
                          {item.title}
                        </span>
                        {item.pathTitle && (
                          <span className="mt-1 block text-sm break-words text-muted-foreground">
                            Lộ trình: {item.pathTitle}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
