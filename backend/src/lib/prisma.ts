import { PrismaClient } from "@prisma/client";

// A single shared Prisma instance avoids exhausting DB connections
// when the module is re-imported (e.g. during tests with tsx/vitest).
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma = global.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
