import { getRooms } from "@/features/rooms/service";
export default async function RoomsPage() {
  const rooms = await getRooms();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Rooms</h1>
      <ul className="mt-6 space-y-2">
        {rooms.map((room) => (
          <li key={room.id}>
            {room.path.title} / {room.title}
          </li>
        ))}
      </ul>
    </main>
  );
}
