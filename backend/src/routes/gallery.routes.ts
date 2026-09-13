import { Router } from "express";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { hashValue, compareValue, generatePin } from "../lib/auth";
import { publishGallerySchema, verifyPinSchema } from "../validation/schemas";

export const galleryRouter = Router();
galleryRouter.use(authenticate);

// Publish (or re-publish) a gallery for an event (Admin/owner only)
galleryRouter.post("/events/:eventId/gallery", requireRole("ADMIN"), async (req, res) => {
  const { eventId } = req.params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.createdBy !== req.user!.userId) {
    return res.status(403).json({ error: "Only the event owner can publish a gallery" });
  }

  const parsed = publishGallerySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const photos = await prisma.photo.findMany({
    where: { id: { in: parsed.data.photoIds }, eventId },
  });
  if (photos.length !== parsed.data.photoIds.length) {
    return res.status(400).json({ error: "One or more photos do not belong to this event" });
  }

  // Mark the chosen photos as selected, and clear anything deselected this round.
  await prisma.$transaction([
    prisma.photo.updateMany({ where: { eventId }, data: { selected: false } }),
    prisma.photo.updateMany({ where: { id: { in: parsed.data.photoIds } }, data: { selected: true } }),
  ]);

  const pin = generatePin();
  const pinHash = await hashValue(pin);
  const existing = await prisma.gallery.findUnique({ where: { eventId } });

  const gallery = existing
    ? await prisma.gallery.update({
        where: { eventId },
        data: {
          pinHash,
          publishedAt: new Date(),
          photos: {
            deleteMany: {},
            create: parsed.data.photoIds.map((photoId) => ({ photoId })),
          },
        },
      })
    : await prisma.gallery.create({
        data: {
          eventId,
          slug: nanoid(8),
          pinHash,
          photos: { create: parsed.data.photoIds.map((photoId) => ({ photoId })) },
        },
      });

  res.status(201).json({
    gallery: { slug: gallery.slug, publishedAt: gallery.publishedAt, photoCount: photos.length },
    pin, // returned once, at publish time, so the Admin can share it — never stored in plaintext
  });
});

// Admin view of gallery status for an event
galleryRouter.get("/events/:eventId/gallery", requireRole("ADMIN"), async (req, res) => {
  const { eventId } = req.params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.createdBy !== req.user!.userId) {
    return res.status(403).json({ error: "Only the event owner can view this gallery" });
  }
  const gallery = await prisma.gallery.findUnique({
    where: { eventId },
    include: { photos: { include: { photo: true } } },
  });
  res.json({ gallery });
});

// --- Public, unauthenticated routes (mounted separately, no JWT needed) ---

export const publicGalleryRouter = Router();

// Lets the customer's link-open confirm the gallery exists before asking for a PIN
publicGalleryRouter.get("/:slug", async (req, res) => {
  const gallery = await prisma.gallery.findUnique({
    where: { slug: req.params.slug },
    include: { event: { select: { name: true } } },
  });
  if (!gallery) return res.status(404).json({ error: "This gallery link is invalid or has expired" });
  res.json({ eventName: gallery.event.name, publishedAt: gallery.publishedAt });
});

// Verifies the PIN and returns the published photos only on success
publicGalleryRouter.post("/:slug/access", async (req, res) => {
  const gallery = await prisma.gallery.findUnique({
    where: { slug: req.params.slug },
    include: { event: { select: { name: true } }, photos: { include: { photo: true } } },
  });
  if (!gallery) return res.status(404).json({ error: "This gallery link is invalid or has expired" });

  const parsed = verifyPinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter the 6-digit PIN that was shared with you" });
  }

  const correct = await compareValue(parsed.data.pin, gallery.pinHash);
  if (!correct) {
    return res.status(401).json({ error: "Incorrect PIN. Please check the code and try again." });
  }

  res.json({
    eventName: gallery.event.name,
    publishedAt: gallery.publishedAt,
    photos: gallery.photos.map((gp: (typeof gallery.photos)[number]) => ({
      id: gp.photo.id,
      url: gp.photo.storageLocation,
      filename: gp.photo.filename,
    })),
  });
});
