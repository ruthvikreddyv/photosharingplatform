import { prisma } from "./prisma";

/** Confirms a user may see a given event: the Admin who owns it, or a
 *  Team Member explicitly assigned to it. Used to reject cross-event
 *  access attempts everywhere events/photos/galleries are read. */
export async function assertEventAccess(
  eventId: string,
  userId: string,
  role: "ADMIN" | "MEMBER"
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { event: null, allowed: false, isOwner: false };
  if (role === "ADMIN") {
    return { event, allowed: event.createdBy === userId, isOwner: event.createdBy === userId };
  }
  const membership = await prisma.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  return { event, allowed: Boolean(membership), isOwner: false };
}
