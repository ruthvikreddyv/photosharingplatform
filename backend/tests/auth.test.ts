import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, uniqueEmail } from "./setup";

describe("Authentication", () => {
  it("registers a new Admin and returns a token", async () => {
    const email = uniqueEmail("admin");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Admin", email, password: "Passw0rd!", role: "ADMIN" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("rejects registering the same email twice", async () => {
    const email = uniqueEmail("dupe");
    await request(app)
      .post("/api/auth/register")
      .send({ name: "First", email, password: "Passw0rd!", role: "MEMBER" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Second", email, password: "Passw0rd!", role: "MEMBER" });

    expect(res.status).toBe(409);
  });

  it("rejects login with a wrong password", async () => {
    const email = uniqueEmail("wrongpw");
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Someone", email, password: "Passw0rd!", role: "MEMBER" });

    const res = await request(app).post("/api/auth/login").send({ email, password: "nope" });
    expect(res.status).toBe(401);
  });

  it("rejects requests to protected routes without a token", async () => {
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(401);
  });
});
