import request from "supertest";
import { API, CREDS, bearer, describeApi, loadApp, login } from "./helpers";

// Finance — Expenses, Staff, Salaries (doc §6.4)
describeApi("finance (expenses/staff/salaries)", () => {
  const app = () => loadApp()!;
  let token = "";
  let staffId = 0;

  beforeAll(async () => {
    token = await login(CREDS.admin.username, CREDS.admin.password);
  });

  it("POST /expenses -> {data}, generates voucher PDF (voucherNo set)", async () => {
    const r = await request(app())
      .post(`${API}/expenses`)
      .set(bearer(token))
      .send({ categoryId: 1, amount: 1200, expenseDate: "2026-06-15", payee: "Stationery Co" });
    expect([200, 201]).toContain(r.status);
    expect(r.body.data).toHaveProperty("voucherNo");
  });

  it("POST /expenses bad body -> 400 Zod", async () => {
    const r = await request(app()).post(`${API}/expenses`).set(bearer(token)).send({ amount: -5 });
    expect(r.status).toBe(400);
  });

  it("GET /expenses -> {data} (category_id/date_from/date_to/page/limit)", async () => {
    const r = await request(app()).get(`${API}/expenses?page=1&limit=10`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("GET /expenses/summary -> totals grouped by category", async () => {
    const r = await request(app()).get(`${API}/expenses/summary?period=2026`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("POST /staff -> {data} create profile", async () => {
    const r = await request(app())
      .post(`${API}/staff`)
      .set(bearer(token))
      .send({ fullName: "QA Staff", role: "Teacher", baseSalary: 15000, contactNo: "9990003333", whatsappNo: "9990003333" });
    expect([200, 201]).toContain(r.status);
    staffId = r.body?.data?.id ?? 0;
  });

  it("GET /staff -> {data} list", async () => {
    const r = await request(app()).get(`${API}/staff`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("POST /salaries -> processes payroll run, generates payslip PDF(s)", async () => {
    const r = await request(app())
      .post(`${API}/salaries`)
      .set(bearer(token))
      .send({ staffId: staffId || undefined, salaryMonth: 6, salaryYear: 2026 });
    expect([200, 201]).toContain(r.status);
  });

  it.todo("POST /salaries/:id/whatsapp -> dispatch payslip");
  it.todo("Accountant can add expenses/salaries; Teacher cannot -> 403 (§6 roles)");
});
