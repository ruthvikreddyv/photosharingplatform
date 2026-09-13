import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  const passwordHash = await bcrypt.hash("Passw0rd!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { name: "Asha Admin", email: "admin@demo.com", passwordHash, role: "ADMIN" },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@demo.com" },
    update: {},
    create: { name: "Rahul Member", email: "member@demo.com", passwordHash, role: "MEMBER" },
  });

  const event = await prisma.event.upsert({
    where: { id: "demo-event-seed" },
    update: {},
    create: { id: "demo-event-seed", name: "Arjun & Priya Wedding", createdBy: admin.id },
  });

  await prisma.eventMember.upsert({
    where: { eventId_userId: { eventId: event.id, userId: member.id } },
    update: {},
    create: { eventId: event.id, userId: member.id },
  });

  // A handful of placeholder photo records (no real binaries needed for the demo)
  const photoData = Array.from({ length: 6 }).map((_, i) => ({
    id: `demo-photo-${i + 1}`,
    eventId: event.id,
    uploadedById: member.id,
    filename: `wedding-${i + 1}.jpg`,
    storageKey: `${event.id}/demo-${i + 1}.jpg`,
    storageLocation: `https://picsum.photos/seed/wedding${i + 1}/800/600`,
    mimeType: "image/jpeg",
    fileSize: 245_000,
    selected: i < 4,
  }));

  for (const p of photoData) {
    await prisma.photo.upsert({ where: { id: p.id }, update: {}, create: p });
  }

  const pin = "482917";
  const pinHash = await bcrypt.hash(pin, 10);

  const gallery = await prisma.gallery.upsert({
    where: { eventId: event.id },
    update: {},
    create: { eventId: event.id, slug: "abc123", pinHash },
  });

  for (const p of photoData.filter((p) => p.selected)) {
    await prisma.galleryPhoto.upsert({
      where: { galleryId_photoId: { galleryId: gallery.id, photoId: p.id } },
      update: {},
      create: { galleryId: gallery.id, photoId: p.id },
    });
  }

  console.log("\nDemo data ready:");
  console.log("  Admin login:   admin@demo.com / Passw0rd!");
  console.log("  Member login:  member@demo.com / Passw0rd!");
  console.log(`  Gallery link:  /gallery/${gallery.slug}`);
  console.log(`  Gallery PIN:   ${pin}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
