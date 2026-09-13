import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { createEventSchema, addMemberSchema } from "../validation/schemas";
import { assertEventAccess } from "../lib/access";

export const eventsRouter = Router();

eventsRouter.use(authenticate);

// Create an event (Admin only)
eventsRouter.post("/", requireRole("ADMIN"), async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const event = await prisma.event.create({
    data: { name: parsed.data.name, createdBy: req.user!.userId },
  });
  res.status(201).json({ event });
});

// List events visible to the current user
eventsRouter.get("/", async (req, res) => {
  const { userId, role } = req.user!;
  const events =
    role === "ADMIN"
      ? await prisma.event.findMany({
          where: { createdBy: userId },
          include: { gallery: true, _count: { select: { photos: true, members: true } } },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.event.findMany({
          where: { members: { some: { userId } } },
          include: { _count: { select: { photos: true } } },
          orderBy: { createdAt: "desc" },
        });
  res.json({ events });
});

// Event detail (access-controlled: only the owning Admin or an assigned Member)
eventsRouter.get("/:eventId", async (req, res) => {
  const { eventId } = req.params;
  const { allowed, event } = await assertEventAccess(eventId, req.user!.userId, req.user!.role);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!allowed) return res.status(403).json({ error: "You do not have access to this event" });

  const members = await prisma.eventMember.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const gallery = await prisma.gallery.findUnique({ where: { eventId } });
  res.json({ event, members: members.map((m: (typeof members)[number]) => m.user), gallery });
});

// Add a Team Member to an event (Admin only, and only the event's owner)
eventsRouter.post("/:eventId/members", requireRole("ADMIN"), async (req, res) => {
  const { eventId } = req.params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.createdBy !== req.user!.userId) {
    return res.status(403).json({ error: "Only the event owner can add team members" });
  }

  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(404).json({ error: "No user found with that email" });
  if (user.role !== "MEMBER") {
    return res.status(400).json({ error: "Only Team Member accounts can be added to an event" });
  }

  const membership = await prisma.eventMember.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    update: {},
    create: { eventId, userId: user.id },
  });
  res.status(201).json({ membership, user: { id: user.id, name: user.name, email: user.email } });
});
