export function PathList({
  paths,
}: {
  paths: { id: string; title: string; description: string }[];
}) {
  return (
    <ul className="mt-6 space-y-3">
      {paths.map((path) => (
        <li className="rounded-lg border p-4" key={path.id}>
          <h2 className="font-semibold text-primary">{path.title}</h2>
          <p className="text-muted-foreground">{path.description}</p>
        </li>
      ))}
    </ul>
  );
}
