import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app, uniqueEmail } from "./setup";

describe("Gallery publishing and PIN-protected access", () => {
  let adminToken: string;
  let eventId: string;
  let photoIds: string[];
  let slug: string;
  let pin: string;

  beforeAll(async () => {
    const email = uniqueEmail("galleryadmin");
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Gallery Admin", email, password: "Passw0rd!", role: "ADMIN" });
    adminToken = registerRes.body.token;

    const eventRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Gallery Test Event" });
    eventId = eventRes.body.event.id;

    const uploadRes = await request(app)
      .post(`/api/events/${eventId}/photos`)
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("photos", Buffer.from("fake-image-bytes"), "photo1.jpg")
      .attach("photos", Buffer.from("fake-image-bytes-2"), "photo2.jpg");

    photoIds = uploadRes.body.photos.map((p: { id: string }) => p.id);
  });

  it("rejects an upload with no files", async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/photos`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it("publishes a gallery and returns a link slug + PIN", async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/gallery`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ photoIds: [photoIds[0]] }); // only publish one of the two photos

    expect(res.status).toBe(201);
    expect(res.body.pin).toMatch(/^\d{6}$/);
    slug = res.body.gallery.slug;
    pin = res.body.pin;
  });

  it("rejects the wrong PIN", async () => {
    const res = await request(app).post(`/api/public/gallery/${slug}/access`).send({ pin: "000000" });
    expect(res.status).toBe(401);
  });

  it("accepts the correct PIN and returns only the published photos", async () => {
    const res = await request(app).post(`/api/public/gallery/${slug}/access`).send({ pin });
    expect(res.status).toBe(200);
    expect(res.body.photos).toHaveLength(1); // the second, unselected photo must not appear
    expect(res.body.photos[0].id).toBe(photoIds[0]);
  });

  it("returns 404 for a gallery slug that doesn't exist", async () => {
    const res = await request(app)
      .post(`/api/public/gallery/not-a-real-slug/access`)
      .send({ pin: "123456" });
    expect(res.status).toBe(404);
  });

  it("never exposes unpublished photos through the public endpoint", async () => {
    const res = await request(app).post(`/api/public/gallery/${slug}/access`).send({ pin });
    const returnedIds = res.body.photos.map((p: { id: string }) => p.id);
    expect(returnedIds).not.toContain(photoIds[1]); // the photo that was left out of publishing
  });
});
