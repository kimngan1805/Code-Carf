/**
 * Whether a learner may open a room.
 *
 * This is a cross-stream contract (see issue #62): the room, exercise and
 * submission flows call it before serving room content. The signature must stay
 * stable. Issue #12 replaces the body with the real sequential-unlock rule
 * (a room opens once the room at the previous `position` is completed).
 *
 * Stub: always grants access until #12 lands.
 */
export async function canAccessRoom(
  userId: string,
  roomId: string,
): Promise<boolean> {
  void userId;
  void roomId;
  return true;
}
