import request from "supertest";
import { API, CREDS, bearer, describeApi, loadApp, login } from "./helpers";

// Infra + Auth (doc §6 auth, §13.1 security, BUILD_CONTRACT §2/§3)
describeApi("infra + auth", () => {
  const app = () => loadApp()!;

  it("GET /health -> 200, no auth required", async () => {
    const r = await request(app()).get("/health");
    expect(r.status).toBe(200);
  });

  it("protected route without token -> 401 error envelope", async () => {
    const r = await request(app()).get(`${API}/students`);
    expect(r.status).toBe(401);
    expect(r.body).toHaveProperty("error");
    expect(r.body.error).toHaveProperty("code");
  });

  it("POST /auth/login valid creds -> 200 {data:{accessToken,refreshToken,user}}", async () => {
    const r = await request(app()).post(`${API}/auth/login`).send(CREDS.admin);
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveProperty("accessToken");
    expect(r.body.data).toHaveProperty("refreshToken");
    expect(r.body.data.user).toMatchObject({ username: CREDS.admin.username });
    expect(r.body.data.user).toHaveProperty("role");
  });

  it("POST /auth/login wrong password -> 401 error envelope", async () => {
    const r = await request(app())
      .post(`${API}/auth/login`)
      .send({ username: CREDS.admin.username, password: "wrong" });
    expect(r.status).toBe(401);
    expect(r.body).toHaveProperty("error");
  });

  it("POST /auth/login bad body (missing password) -> 400 Zod", async () => {
    const r = await request(app()).post(`${API}/auth/login`).send({ username: "x" });
    expect(r.status).toBe(400);
  });

  it("POST /auth/refresh with valid refresh token -> new access token", async () => {
    const login = await request(app()).post(`${API}/auth/login`).send(CREDS.admin);
    const r = await request(app())
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: login.body.data.refreshToken });
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveProperty("accessToken");
    expect(r.body.data).toHaveProperty("refreshToken");
  });

  it("oversized JSON body is rejected (express.json limit)", async () => {
    const r = await request(app())
      .post(`${API}/auth/login`)
      .send({ username: "a", password: "x".repeat(1.5 * 1024 * 1024) });
    // Express payload-too-large → 413 (or 400 depending on errorHandler wiring)
    expect([400, 413]).toContain(r.status);
  });

  it.todo("passwords stored as bcrypt hashes, never returned in any response (§13.1)");

  it("GET /auth/me without token -> 401", async () => {
    const r = await request(app()).get(`${API}/auth/me`);
    expect(r.status).toBe(401);
    expect(r.body).toHaveProperty("error");
  });

  it("GET /auth/me with valid token -> 200 with own profile, no passwordHash", async () => {
    const token = await login(CREDS.admin.username, CREDS.admin.password);
    const r = await request(app()).get(`${API}/auth/me`).set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ username: CREDS.admin.username });
    expect(r.body.data).toHaveProperty("fullName");
    expect(r.body.data).toHaveProperty("role");
    expect(r.body.data).toHaveProperty("status");
    expect(r.body.data).not.toHaveProperty("passwordHash");
  });
});
