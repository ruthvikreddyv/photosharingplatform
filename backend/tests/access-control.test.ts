import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app, uniqueEmail } from "./setup";

async function registerAndLogin(role: "ADMIN" | "MEMBER", name: string) {
  const email = uniqueEmail(role.toLowerCase());
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "Passw0rd!", role });
  return { token: res.body.token as string, email, userId: res.body.user.id as string };
}

describe("Role-based and cross-event access control", () => {
  let ownerAdmin: Awaited<ReturnType<typeof registerAndLogin>>;
  let otherAdmin: Awaited<ReturnType<typeof registerAndLogin>>;
  let teamMember: Awaited<ReturnType<typeof registerAndLogin>>;
  let outsiderMember: Awaited<ReturnType<typeof registerAndLogin>>;
  let eventId: string;

  beforeAll(async () => {
    ownerAdmin = await registerAndLogin("ADMIN", "Owner Admin");
    otherAdmin = await registerAndLogin("ADMIN", "Other Admin");
    teamMember = await registerAndLogin("MEMBER", "Team Member");
    outsiderMember = await registerAndLogin("MEMBER", "Outsider Member");

    const eventRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${ownerAdmin.token}`)
      .send({ name: "Access Control Test Event" });
    eventId = eventRes.body.event.id;

    await request(app)
      .post(`/api/events/${eventId}/members`)
      .set("Authorization", `Bearer ${ownerAdmin.token}`)
      .send({ email: teamMember.email });
  });

  it("prevents a Team Member from creating an event", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${teamMember.token}`)
      .send({ name: "Should Fail" });
    expect(res.status).toBe(403);
  });

  it("prevents a Team Member from publishing a gallery", async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/gallery`)
      .set("Authorization", `Bearer ${teamMember.token}`)
      .send({ photoIds: ["whatever"] });
    expect(res.status).toBe(403);
  });

  it("prevents an outsider Member (not assigned to the event) from viewing it", async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${outsiderMember.token}`);
    expect(res.status).toBe(403);
  });

  it("prevents another Admin from managing an event they don't own", async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/members`)
      .set("Authorization", `Bearer ${otherAdmin.token}`)
      .send({ email: outsiderMember.email });
    expect(res.status).toBe(403);
  });

  it("allows the assigned Team Member to view the event", async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${teamMember.token}`);
    expect(res.status).toBe(200);
  });

  it("returns 404 (not exposing existence) for a completely invalid event id", async () => {
    const res = await request(app)
      .get(`/api/events/does-not-exist`)
      .set("Authorization", `Bearer ${teamMember.token}`);
    expect(res.status).toBe(404);
  });
});
