import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createEventSchema = z.object({
  name: z.string().min(2).max(150),
});

export const addMemberSchema = z.object({
  email: z.string().email(),
});

export const publishGallerySchema = z.object({
  photoIds: z.array(z.string()).min(1, "Select at least one photo to publish"),
});

export const verifyPinSchema = z.object({
  pin: z.string().length(6),
});
