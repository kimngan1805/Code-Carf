import { getContests } from "@/features/contests/service";
export default async function ContestsPage() {
  const contests = await getContests();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Contests</h1>
      <ul className="mt-6 space-y-2">
        {contests.map((contest) => (
          <li key={contest.id}>
            {contest.title} ({contest.status})
          </li>
        ))}
      </ul>
    </main>
  );
}
