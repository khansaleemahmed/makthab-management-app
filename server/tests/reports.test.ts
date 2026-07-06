import request from "supertest";
import { API, CREDS, bearer, describeApi, loadApp, login } from "./helpers";

// Reports (doc §6.5) — each returns PDF or XLSX (financial-summary PDF only)
const XLSX = /spreadsheetml\.sheet/;
const PDF = /application\/pdf/;

describeApi("reports", () => {
  const app = () => loadApp()!;
  let token = "";
  beforeAll(async () => {
    token = await login(CREDS.admin.username, CREDS.admin.password);
  });

  it("GET /reports/fee-collection?month&year -> PDF", async () => {
    const r = await request(app()).get(`${API}/reports/fee-collection?month=6&year=2026`).set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(PDF);
  });

  it("GET /reports/fee-collection?...&format=xlsx -> XLSX", async () => {
    const r = await request(app()).get(`${API}/reports/fee-collection?month=6&year=2026&format=xlsx`).set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(XLSX);
  });

  it("GET /reports/defaulters?month&year -> PDF/XLSX", async () => {
    const r = await request(app()).get(`${API}/reports/defaulters?month=6&year=2026`).set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(new RegExp(`${PDF.source}|${XLSX.source}`));
  });

  it("GET /reports/attendance?class_id&month&year -> PDF/XLSX", async () => {
    const r = await request(app()).get(`${API}/reports/attendance?class_id=1&month=6&year=2026`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("GET /reports/expenses?period -> PDF/XLSX", async () => {
    const r = await request(app()).get(`${API}/reports/expenses?period=2026`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("GET /reports/salary-register?month&year -> PDF/XLSX", async () => {
    const r = await request(app()).get(`${API}/reports/salary-register?month=6&year=2026`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("GET /reports/financial-summary?year -> PDF only", async () => {
    const r = await request(app()).get(`${API}/reports/financial-summary?year=2026`).set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(PDF);
  });
});
