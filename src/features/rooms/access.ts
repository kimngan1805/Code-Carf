import { findPreviousRoom, findRoomAccess } from "./repository";

/**
 * Whether a learner may open a room.
 *
 * This is a cross-stream contract (see issue #62): the room, exercise and
 * submission flows call it before serving room content. The signature must stay
 * stable. Learners must enroll in a published path. The first room is open;
 * other rooms require completion of the preceding room in position order.
 * Paths can disable sequential unlock. Read progress fresh on every call.
 */
export async function canAccessRoom(
  userId: string,
  roomId: string,
): Promise<boolean> {
  const room = await findRoomAccess(roomId, userId);
  if (
    !room ||
    !room.published ||
    !room.path.published ||
    room.path.enrollments.length === 0
  )
    return false;
  if (!room.path.sequentialUnlock) return true;
  const previous = await findPreviousRoom(room.pathId, room.position, userId);
  return previous === null || previous.progress.length > 0;
}
