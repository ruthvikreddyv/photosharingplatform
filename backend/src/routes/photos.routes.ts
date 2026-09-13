import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { assertEventAccess } from "../lib/access";
import { storage } from "../lib/storage";

export const photosRouter = Router();
photosRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per photo
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Upload one or more photos to an event (Admin or an assigned Team Member)
photosRouter.post(
  "/events/:eventId/photos",
  upload.array("photos", 30),
  async (req, res) => {
    const { eventId } = req.params;
    const { allowed, event } = await assertEventAccess(eventId, req.user!.userId, req.user!.role);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (!allowed) return res.status(403).json({ error: "You do not have access to this event" });

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No photo files were provided" });
    }

    try {
      const created = await Promise.all(
        files.map(async (file) => {
          const stored = await storage.save(eventId, file.originalname, file.buffer);
          return prisma.photo.create({
            data: {
              eventId,
              uploadedById: req.user!.userId,
              filename: file.originalname,
              storageKey: stored.key,
              storageLocation: stored.location,
              mimeType: file.mimetype,
              fileSize: file.size,
            },
          });
        })
      );
      res.status(201).json({ photos: created });
    } catch (err) {
      res.status(500).json({ error: "Photo upload failed. Please try again." });
    }
  }
);

// List photos for an event
photosRouter.get("/events/:eventId/photos", async (req, res) => {
  const { eventId } = req.params;
  const { allowed, event } = await assertEventAccess(eventId, req.user!.userId, req.user!.role);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!allowed) return res.status(403).json({ error: "You do not have access to this event" });

  const isOwnerAdmin = req.user!.role === "ADMIN" && event.createdBy === req.user!.userId;
  const photos = await prisma.photo.findMany({
    where: isOwnerAdmin
      ? { eventId } // Admin sees everything the team uploaded
      : { eventId, uploadedById: req.user!.userId }, // Members only see their own uploads
    orderBy: { createdAt: "desc" },
  });
  res.json({ photos });
});

// Toggle a photo's "selected for gallery" flag (Admin/owner only)
photosRouter.patch("/photos/:photoId/select", requireRole("ADMIN"), async (req, res) => {
  const { photoId } = req.params;
  const { selected } = req.body as { selected?: boolean };
  if (typeof selected !== "boolean") {
    return res.status(400).json({ error: "'selected' must be a boolean" });
  }

  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { event: true } });
  if (!photo) return res.status(404).json({ error: "Photo not found" });
  if (photo.event.createdBy !== req.user!.userId) {
    return res.status(403).json({ error: "You do not manage this event" });
  }

  const updated = await prisma.photo.update({ where: { id: photoId }, data: { selected } });
  res.json({ photo: updated });
});
