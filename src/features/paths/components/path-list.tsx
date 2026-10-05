export function PathList({
  paths,
}: {
  paths: { id: string; title: string; description: string }[];
}) {
  return (
    <ul className="mt-6 space-y-3">
      {paths.map((path) => (
        <li className="rounded border p-4" key={path.id}>
          <h2 className="font-semibold">{path.title}</h2>
          <p>{path.description}</p>
        </li>
      ))}
    </ul>
  );
}
