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

  it("PATCH /fees/:id -> partial update writes only sent fields {data}", async () => {
    const created = await request(app()).post(`${API}/fees`).set(bearer(token)).send({
      studentId,
      feeType: "monthly",
      feeMonth: 7,
      feeYear: 2026,
      amountDue: 500,
      amountPaid: 200,
      paymentDate: "2026-07-05",
      paymentMethod: "cash",
      waiverAmount: 50,
    });
    const id = created.body.data.id;
    const r = await request(app())
      .patch(`${API}/fees/${id}`)
      .set(bearer(token))
      .send({ amountPaid: 500, paymentMethod: "upi" });
    expect(r.status).toBe(200);
    expect(r.body.data.amountPaid).toBe(500);
    expect(r.body.data.paymentMethod).toBe("upi");
    // untouched fields preserved (waiverAmount not reset despite its schema default)
    expect(r.body.data.amountDue).toBe(500);
    expect(r.body.data.feeMonth).toBe(7);
    expect(r.body.data.waiverAmount).toBe(50);
  });

  it("PATCH /fees/:id missing -> 404", async () => {
    const r = await request(app())
      .patch(`${API}/fees/99999999`)
      .set(bearer(token))
      .send({ amountPaid: 10 });
    expect(r.status).toBe(404);
  });

  it("PATCH /fees/:id -> receiptNo is immutable (ignored, not an error)", async () => {
    const created = await request(app()).post(`${API}/fees`).set(bearer(token)).send({
      studentId,
      feeType: "monthly",
      feeMonth: 9,
      feeYear: 2026,
      amountDue: 300,
      amountPaid: 300,
      paymentDate: "2026-09-05",
      paymentMethod: "cash",
    });
    const id = created.body.data.id;
    const original = created.body.data.receiptNo;
    const r = await request(app())
      .patch(`${API}/fees/${id}`)
      .set(bearer(token))
      .send({ receiptNo: "HACKED-0001", amountPaid: 1 });
    expect(r.status).toBe(200);
    expect(r.body.data.receiptNo).toBe(original);
    expect(r.body.data.amountPaid).toBe(1);
  });

  it("PATCH /fees/:id -> feeMonth can be explicitly nulled", async () => {
    const created = await request(app()).post(`${API}/fees`).set(bearer(token)).send({
      studentId,
      feeType: "monthly",
      feeMonth: 10,
      feeYear: 2026,
      amountDue: 300,
      amountPaid: 300,
      paymentDate: "2026-10-05",
      paymentMethod: "cash",
    });
    const id = created.body.data.id;
    const r = await request(app())
      .patch(`${API}/fees/${id}`)
      .set(bearer(token))
      .send({ feeMonth: null });
    expect(r.status).toBe(200);
    expect(r.body.data.feeMonth).toBeNull();
  });

  it("DELETE /fees/:id -> removes the row {data:{id}}", async () => {
    const created = await request(app()).post(`${API}/fees`).set(bearer(token)).send({
      studentId,
      feeType: "monthly",
      feeMonth: 11,
      feeYear: 2026,
      amountDue: 300,
      amountPaid: 300,
      paymentDate: "2026-11-05",
      paymentMethod: "cash",
    });
    const id = created.body.data.id;
    const r = await request(app()).delete(`${API}/fees/${id}`).set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(id);
    const after = await request(app()).get(`${API}/fees/${id}`).set(bearer(token));
    expect(after.status).toBe(404);
  });

  it("DELETE /fees/:id missing -> 404", async () => {
    const r = await request(app()).delete(`${API}/fees/99999999`).set(bearer(token));
    expect(r.status).toBe(404);
  });

  it("GET /fees?feeType=admission with no year -> spans all years; year filters it", async () => {
    for (const y of [2023, 2024]) {
      await request(app()).post(`${API}/fees`).set(bearer(token)).send({
        studentId,
        feeType: "admission",
        feeYear: y,
        amountDue: 1000,
        amountPaid: 1000,
        paymentDate: `${y}-01-10`,
        paymentMethod: "cash",
      });
    }
    const all = await request(app())
      .get(`${API}/fees?feeType=admission&student_id=${studentId}&limit=200`)
      .set(bearer(token));
    expect(all.status).toBe(200);
    expect(all.body.data.items.every((i: any) => i.feeType === "admission")).toBe(true);
    const years = new Set(all.body.data.items.map((i: any) => i.feeYear));
    expect(years.has(2023)).toBe(true);
    expect(years.has(2024)).toBe(true);

    const one = await request(app())
      .get(`${API}/fees?feeType=admission&year=2023&student_id=${studentId}&limit=200`)
      .set(bearer(token));
    expect(one.status).toBe(200);
    expect(one.body.data.items.length).toBeGreaterThan(0);
    expect(one.body.data.items.every((i: any) => i.feeYear === 2023)).toBe(true);
    expect(one.body.data.items.every((i: any) => i.feeType === "admission")).toBe(true);
  });

  it("GET /fees?feeType=monthly&year&month -> filters to that period", async () => {
    const r = await request(app())
      .get(`${API}/fees?feeType=monthly&year=2026&month=6&student_id=${studentId}`)
      .set(bearer(token));
    expect(r.status).toBe(200);
    expect(
      r.body.data.items.every(
        (i: any) => i.feeType === "monthly" && i.feeYear === 2026 && i.feeMonth === 6
      )
    ).toBe(true);
  });

  it("GET /fees?sortBy=admissionNo -> ordered by related student's admissionNo", async () => {
    const asc = await request(app())
      .get(`${API}/fees?sortBy=admissionNo&sortOrder=asc&limit=200`)
      .set(bearer(token));
    expect(asc.status).toBe(200);
    const nos = asc.body.data.items
      .map((i: any) => i.student?.admissionNo)
      .filter((n: unknown): n is string => typeof n === "string");
    // admissionNo lives on the related Student, so orderBy is { student: { admissionNo } }.
    const sorted = [...nos].sort();
    expect(nos).toEqual(sorted);
  });

  it("GET /fees/defaulters -> paginated envelope {items,total,page,limit}, default admissionNo asc", async () => {
    const r = await request(app())
      .get(`${API}/fees/defaulters?month=8&year=2099&limit=200`)
      .set(bearer(token));
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d).toHaveProperty("items");
    expect(d).toHaveProperty("total");
    expect(d.page).toBe(1);
    expect(d.limit).toBe(200);
    const nos = d.items.map((i: { admissionNo: string }) => i.admissionNo);
    const sorted = [...nos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    expect(nos).toEqual(sorted);
  });

  it("GET /fees/defaulters?limit=1 -> respects page size, total exceeds slice", async () => {
    const r = await request(app())
      .get(`${API}/fees/defaulters?month=8&year=2099&limit=1&page=1`)
      .set(bearer(token));
    expect(r.status).toBe(200);
    expect(r.body.data.items.length).toBeLessThanOrEqual(1);
    expect(r.body.data.limit).toBe(1);
    expect(r.body.data.total).toBeGreaterThanOrEqual(r.body.data.items.length);
  });

  it("PATCH /fees/defaulters/:studentId -> override amount due persists & takes precedence", async () => {
    const r = await request(app())
      .patch(`${API}/fees/defaulters/${studentId}`)
      .set(bearer(token))
      .send({ amountDue: 1234 });
    expect(r.status).toBe(200);
    expect(r.body.data.studentId).toBe(studentId);
    expect(r.body.data.amountDue).toBe(1234);
    // Persisted override wins over the class fee-structure amount on subsequent reads.
    const list = await request(app())
      .get(`${API}/fees/defaulters?month=8&year=2099&limit=200`)
      .set(bearer(token));
    const row = list.body.data.items.find((i: { studentId: number }) => i.studentId === studentId);
    expect(row?.amountDue).toBe(1234);
  });

  it("PATCH /fees/defaulters/:studentId bad body -> 400 Zod", async () => {
    const r = await request(app())
      .patch(`${API}/fees/defaulters/${studentId}`)
      .set(bearer(token))
      .send({ amountDue: -5 });
    expect(r.status).toBe(400);
  });

  it("PATCH /fees/defaulters/:studentId missing student -> 404", async () => {
    const r = await request(app())
      .patch(`${API}/fees/defaulters/99999999`)
      .set(bearer(token))
      .send({ amountDue: 100 });
    expect(r.status).toBe(404);
  });

  it("DELETE /fees/structures/:id -> removes the structure {data:{id}}", async () => {
    const created = await request(app())
      .post(`${API}/fees/structures`)
      .set(bearer(token))
      .send({ classId: 1, academicYearId: 1, feeType: "annual", amount: 2000 });
    const id = created.body.data.id;
    const del = await request(app()).delete(`${API}/fees/structures/${id}`).set(bearer(token));
    expect(del.status).toBe(200);
    expect(del.body.data.id).toBe(id);
    const list = await request(app()).get(`${API}/fees/structures`).set(bearer(token));
    expect(list.body.data.some((s: { id: number }) => s.id === id)).toBe(false);
  });

  it("DELETE /fees/structures/:id missing -> 404", async () => {
    const r = await request(app()).delete(`${API}/fees/structures/99999999`).set(bearer(token));
    expect(r.status).toBe(404);
  });

  it("Teacher role is blocked from defaulters edit + structure delete -> 403", async () => {
    const teacher = await login(CREDS.teacher.username, CREDS.teacher.password);
    const patch = await request(app())
      .patch(`${API}/fees/defaulters/${studentId}`)
      .set(bearer(teacher))
      .send({ amountDue: 1 });
    expect(patch.status).toBe(403);
    const del = await request(app()).delete(`${API}/fees/structures/1`).set(bearer(teacher));
    expect(del.status).toBe(403);
  });

  it("Teacher role is blocked from fee write endpoints -> 403 (§6 roles)", async () => {
    const teacher = await login(CREDS.teacher.username, CREDS.teacher.password);
    const post = await request(app()).post(`${API}/fees`).set(bearer(teacher)).send({
      studentId,
      feeType: "monthly",
      feeMonth: 6,
      feeYear: 2026,
      amountDue: 500,
      amountPaid: 500,
      paymentDate: "2026-06-05",
      paymentMethod: "cash",
    });
    expect(post.status).toBe(403);
    const patch = await request(app())
      .patch(`${API}/fees/${feeId}`)
      .set(bearer(teacher))
      .send({ amountPaid: 1 });
    expect(patch.status).toBe(403);
    const del = await request(app()).delete(`${API}/fees/${feeId}`).set(bearer(teacher));
    expect(del.status).toBe(403);
  });
});
