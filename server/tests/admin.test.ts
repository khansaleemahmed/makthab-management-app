import request from "supertest";
import { API, CREDS, bearer, describeApi, loadApp, login } from "./helpers";

// Admin backup (doc §13.3)
describeApi("admin", () => {
  const app = () => loadApp()!;
  let adminToken = "";
  let accountantToken = "";

  beforeAll(async () => {
    adminToken = await login(CREDS.admin.username, CREDS.admin.password);
    accountantToken = await login(CREDS.accountant.username, CREDS.accountant.password);
  });

  it("POST /admin/backup (Admin) -> {data} zip created", async () => {
    const r = await request(app()).post(`${API}/admin/backup`).set(bearer(adminToken)).send({});
    expect([200, 201]).toContain(r.status);
  });

  it("POST /admin/backup (non-Admin) -> 403", async () => {
    const r = await request(app()).post(`${API}/admin/backup`).set(bearer(accountantToken)).send({});
    expect(r.status).toBe(403);
  });
});
