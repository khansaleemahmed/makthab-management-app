import request from "supertest";
import { API, CREDS, bearer, describeApi, loadApp, login } from "./helpers";

// Users — admin-only account/access management (Staff + User provisioned together)
describeApi("users (admin user management)", () => {
  const app = () => loadApp()!;
  let token = "";
  let adminUserId = 0;
  let createdId = 0;
  let createdStaffId = 0;
  const uniq = Date.now();
  const username = `qa_user_${uniq}`;
  const email = `qa_user_${uniq}@example.com`;

  beforeAll(async () => {
    token = await login(CREDS.admin.username, CREDS.admin.password);
    // Find the admin's own user id (for the self-deactivation guard test).
    const list = await request(app())
      .get(`${API}/users?limit=200`)
      .set(bearer(token));
    const me = list.body.data.items.find(
      (u: { username: string }) => u.username === CREDS.admin.username
    );
    adminUserId = me?.id ?? 0;
  });

  it("POST /users -> creates linked Staff + User (201, flattened dto)", async () => {
    const r = await request(app())
      .post(`${API}/users`)
      .set(bearer(token))
      .send({
        fullName: "QA User One",
        username,
        password: "secret123",
        email,
        role: "Accountant",
        contactNo: "9990001111",
        whatsappNo: "9990001111",
        address: "12 Test Street",
      });
    expect(r.status).toBe(201);
    expect(r.body.data.username).toBe(username);
    expect(r.body.data.email).toBe(email);
    expect(r.body.data.role).toBe("Accountant");
    expect(r.body.data.status).toBe("active");
    expect(r.body.data.fullName).toBe("QA User One");
    expect(r.body.data.address).toBe("12 Test Street");
    expect(r.body.data).toHaveProperty("staffId");
    expect(r.body.data).toHaveProperty("photoPath", null);
    createdId = r.body.data.id;
    createdStaffId = r.body.data.staffId;
  });

  it("created User is actually linked to a real Staff row", async () => {
    // The staffId exposed in the dto is what the frontend uses for /staff/:id/photo.
    const r = await request(app())
      .get(`${API}/staff?limit=200`)
      .set(bearer(token));
    const staff = r.body.data.items.find(
      (s: { id: number }) => s.id === createdStaffId
    );
    expect(staff).toBeTruthy();
    expect(staff.fullName).toBe("QA User One");
  });

  it("POST /users bad body -> 400 Zod", async () => {
    const r = await request(app())
      .post(`${API}/users`)
      .set(bearer(token))
      .send({ username: "x", password: "short", email: "not-an-email", role: "Cook" });
    expect(r.status).toBe(400);
  });

  it("POST /users duplicate username -> 409", async () => {
    const r = await request(app())
      .post(`${API}/users`)
      .set(bearer(token))
      .send({
        fullName: "Dup Username",
        username, // same username
        password: "secret123",
        email: `other_${uniq}@example.com`,
        role: "Teacher",
        contactNo: "9990002222",
        whatsappNo: "9990002222",
      });
    expect(r.status).toBe(409);
  });

  it("POST /users duplicate email -> 409", async () => {
    const r = await request(app())
      .post(`${API}/users`)
      .set(bearer(token))
      .send({
        fullName: "Dup Email",
        username: `other_user_${uniq}`,
        password: "secret123",
        email, // same email
        role: "Teacher",
        contactNo: "9990003333",
        whatsappNo: "9990003333",
      });
    expect(r.status).toBe(409);
  });

  it("GET /users -> paginated list", async () => {
    const r = await request(app())
      .get(`${API}/users?page=1&limit=10`)
      .set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveProperty("total");
    expect(Array.isArray(r.body.data.items)).toBe(true);
  });

  it("GET /users?sortBy=username&sortOrder=asc -> sorted", async () => {
    const r = await request(app())
      .get(`${API}/users?sortBy=username&sortOrder=asc&limit=200`)
      .set(bearer(token));
    expect(r.status).toBe(200);
    const names = r.body.data.items.map((u: { username: string }) => u.username);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("GET /users?role=Accountant -> filters by role", async () => {
    const r = await request(app())
      .get(`${API}/users?role=Accountant&limit=200`)
      .set(bearer(token));
    expect(r.status).toBe(200);
    expect(
      r.body.data.items.every((u: { role: string }) => u.role === "Accountant")
    ).toBe(true);
    expect(
      r.body.data.items.some((u: { id: number }) => u.id === createdId)
    ).toBe(true);
  });

  it("GET /users?status=inactive -> filters by status", async () => {
    const r = await request(app())
      .get(`${API}/users?status=inactive&limit=200`)
      .set(bearer(token));
    expect(r.status).toBe(200);
    expect(
      r.body.data.items.every((u: { status: string }) => u.status === "inactive")
    ).toBe(true);
  });

  it("PATCH /users/:id -> edits profile + role {data}", async () => {
    const r = await request(app())
      .patch(`${API}/users/${createdId}`)
      .set(bearer(token))
      .send({ fullName: "QA User Renamed", role: "Teacher", address: "99 New Road" });
    expect(r.status).toBe(200);
    expect(r.body.data.fullName).toBe("QA User Renamed");
    expect(r.body.data.role).toBe("Teacher");
    expect(r.body.data.address).toBe("99 New Road");
    // untouched field preserved
    expect(r.body.data.email).toBe(email);
  });

  it("PATCH /users/:id bad body -> 400 Zod", async () => {
    const r = await request(app())
      .patch(`${API}/users/${createdId}`)
      .set(bearer(token))
      .send({ email: "nope" });
    expect(r.status).toBe(400);
  });

  it("PATCH /users/:id missing -> 404", async () => {
    const r = await request(app())
      .patch(`${API}/users/99999999`)
      .set(bearer(token))
      .send({ fullName: "X" });
    expect(r.status).toBe(404);
  });

  it("DELETE /users/:id -> soft delete, idempotent, only flips User.status", async () => {
    const first = await request(app())
      .delete(`${API}/users/${createdId}`)
      .set(bearer(token));
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe("inactive");
    // repeat call is a quiet no-op, not a 409
    const second = await request(app())
      .delete(`${API}/users/${createdId}`)
      .set(bearer(token));
    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe("inactive");
    // the linked Staff row is untouched (still active)
    const staffList = await request(app())
      .get(`${API}/staff?limit=200`)
      .set(bearer(token));
    const staff = staffList.body.data.items.find(
      (s: { id: number }) => s.id === createdStaffId
    );
    expect(staff.status).toBe("active");
  });

  it("PATCH /users/:id -> can reactivate a deactivated user via status", async () => {
    const r = await request(app())
      .patch(`${API}/users/${createdId}`)
      .set(bearer(token))
      .send({ status: "active" });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe("active");
  });

  it("DELETE /users/:id missing -> 404", async () => {
    const r = await request(app())
      .delete(`${API}/users/99999999`)
      .set(bearer(token));
    expect(r.status).toBe(404);
  });

  it("admin cannot deactivate their own account -> 400", async () => {
    expect(adminUserId).toBeGreaterThan(0);
    const r = await request(app())
      .delete(`${API}/users/${adminUserId}`)
      .set(bearer(token));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("self_action_forbidden");
  });

  it("POST /users/:id/reset-password -> changes auth (old fails, new works)", async () => {
    const newPassword = "brandnew456";
    const r = await request(app())
      .post(`${API}/users/${createdId}/reset-password`)
      .set(bearer(token))
      .send({ password: newPassword });
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(createdId);
    expect(r.body.data).not.toHaveProperty("passwordHash");

    // old password no longer works
    const oldLogin = await request(app())
      .post(`${API}/auth/login`)
      .send({ username, password: "secret123" });
    expect(oldLogin.status).not.toBe(200);

    // new password works
    const newLogin = await request(app())
      .post(`${API}/auth/login`)
      .send({ username, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.data.accessToken).toBeTruthy();
  });

  it("Accountant is blocked from all /users routes -> 403", async () => {
    const acc = await login(CREDS.accountant.username, CREDS.accountant.password);
    const list = await request(app()).get(`${API}/users`).set(bearer(acc));
    expect(list.status).toBe(403);
    const create = await request(app())
      .post(`${API}/users`)
      .set(bearer(acc))
      .send({
        fullName: "Nope",
        username: `nope_${uniq}`,
        password: "secret123",
        email: `nope_${uniq}@example.com`,
        role: "Teacher",
        contactNo: "9990009999",
        whatsappNo: "9990009999",
      });
    expect(create.status).toBe(403);
    const del = await request(app()).delete(`${API}/users/${createdId}`).set(bearer(acc));
    expect(del.status).toBe(403);
  });

  it("Teacher is blocked from all /users routes -> 403", async () => {
    const teacher = await login(CREDS.teacher.username, CREDS.teacher.password);
    const list = await request(app()).get(`${API}/users`).set(bearer(teacher));
    expect(list.status).toBe(403);
    const patch = await request(app())
      .patch(`${API}/users/${createdId}`)
      .set(bearer(teacher))
      .send({ fullName: "X" });
    expect(patch.status).toBe(403);
    const reset = await request(app())
      .post(`${API}/users/${createdId}/reset-password`)
      .set(bearer(teacher))
      .send({ password: "whatever123" });
    expect(reset.status).toBe(403);
  });
});
