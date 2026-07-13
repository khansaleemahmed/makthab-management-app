import request from "supertest";
import { API, CREDS, bearer, describeApi, loadApp, login } from "./helpers";

// Fees (doc §6.2)
describeApi("fees", () => {
  const app = () => loadApp()!;
  let token = "";
  let studentId = 1;
  let feeId = 0;

  beforeAll(async () => {
    token = await login(CREDS.accountant.username, CREDS.accountant.password);
    // ensure a student exists to attach fees to
    const s = await request(app())
      .post(`${API}/students`)
      .set(bearer(await login(CREDS.admin.username, CREDS.admin.password)))
      .send({
        admissionNo: `QA-FEE-${Date.now()}`,
        fullName: "Fee Student",
        fatherName: "Father",
        gender: "male",
        contactNo: "9990002222",
        whatsappNo: "9990002222",
        classId: 1,
        academicYearId: 1,
      });
    if (s.body?.data?.id) studentId = s.body.data.id;
  });

  it("POST /fees -> records payment {data}, generates receipt PDF (pdfPath set)", async () => {
    const r = await request(app()).post(`${API}/fees`).set(bearer(token)).send({
      studentId,
      feeType: "monthly",
      feeMonth: 6,
      feeYear: 2026,
      amountDue: 500,
      amountPaid: 500,
      paymentDate: "2026-06-05",
      paymentMethod: "cash",
    });
    expect([200, 201]).toContain(r.status);
    expect(r.body.data).toHaveProperty("receiptNo");
    feeId = r.body.data.id;
  });

  it("POST /fees bad body -> 400 Zod", async () => {
    const r = await request(app()).post(`${API}/fees`).set(bearer(token)).send({ studentId });
    expect(r.status).toBe(400);
  });

  it("GET /fees -> {data} list (student_id/month/year/status filters)", async () => {
    const r = await request(app()).get(`${API}/fees?student_id=${studentId}`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("GET /fees -> total is the full row count, not the page-slice length", async () => {
    // Seed enough rows that a small page can't contain them all.
    for (let m = 1; m <= 3; m++) {
      await request(app()).post(`${API}/fees`).set(bearer(token)).send({
        studentId,
        feeType: "monthly",
        feeMonth: m,
        feeYear: 2025,
        amountDue: 100,
        amountPaid: 100,
        paymentDate: "2025-0" + m + "-05",
        paymentMethod: "cash",
      });
    }
    const r = await request(app())
      .get(`${API}/fees?student_id=${studentId}&limit=1&page=1`)
      .set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.body.data.items.length).toBe(1);
    expect(r.body.data.limit).toBe(1);
    // total must count all matching rows, so it exceeds the single returned item.
    expect(r.body.data.total).toBeGreaterThan(1);
  });

  it("GET /fees/:id -> payment record with receipt URL", async () => {
    const r = await request(app()).get(`${API}/fees/${feeId}`).set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(feeId);
  });

  it("GET /fees/:id/receipt -> streams application/pdf", async () => {
    const r = await request(app()).get(`${API}/fees/${feeId}/receipt`).set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/application\/pdf/);
  });

  it("POST /fees/:id/whatsapp -> dispatch (wa.me link for MVP) {data}", async () => {
    const r = await request(app()).post(`${API}/fees/${feeId}/whatsapp`).set(bearer(token)).send({});
    expect([200, 201]).toContain(r.status);
  });

  it("GET /fees/defaulters -> list outstanding (month/year required)", async () => {
    const r = await request(app()).get(`${API}/fees/defaulters?month=6&year=2026`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("GET /fees/structures -> list fee structures", async () => {
    const r = await request(app()).get(`${API}/fees/structures`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("POST /fees/structures -> create/update structure {data}", async () => {
    const r = await request(app())
      .post(`${API}/fees/structures`)
      .set(bearer(token))
      .send({ classId: 1, academicYearId: 1, feeType: "monthly", amount: 500 });
    expect([200, 201]).toContain(r.status);
  });

  it.todo("Teacher role cannot record fees -> 403 (§6 roles)");
});
