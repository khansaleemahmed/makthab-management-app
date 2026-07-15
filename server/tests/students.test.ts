import request from "supertest";
import { API, CREDS, bearer, describeApi, loadApp, login } from "./helpers";

// Students (doc §6.1)
describeApi("students", () => {
  const app = () => loadApp()!;
  let adminToken = "";
  let teacherToken = "";
  let createdId = 0;

  beforeAll(async () => {
    adminToken = await login(CREDS.admin.username, CREDS.admin.password);
    teacherToken = await login(CREDS.teacher.username, CREDS.teacher.password);
  });

  const validStudent = {
    admissionNo: `QA-${Date.now()}`,
    fullName: "QA Test Student",
    fatherName: "QA Father",
    dateOfBirth: "2015-04-01",
    gender: "male",
    contactNo: "9990001111",
    whatsappNo: "9990001111",
    classId: 1,
    academicYearId: 1,
  };

  it("POST /students -> 200/201 {data} (admit)", async () => {
    const r = await request(app()).post(`${API}/students`).set(bearer(adminToken)).send(validStudent);
    expect([200, 201]).toContain(r.status);
    expect(r.body.data).toHaveProperty("id");
    createdId = r.body.data.id;
  });

  it("POST /students bad body -> 400 Zod", async () => {
    const r = await request(app()).post(`${API}/students`).set(bearer(adminToken)).send({ fullName: "" });
    expect(r.status).toBe(400);
  });

  it("GET /students -> {data} list, supports q/class_id/status/page/limit", async () => {
    const r = await request(app()).get(`${API}/students?limit=5&page=1`).set(bearer(adminToken));
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(Array.isArray(d) || Array.isArray(d?.items)).toBe(true);
  });

  it("GET /students -> paginated envelope + sortBy=fullName asc orders items", async () => {
    const r = await request(app())
      .get(`${API}/students?limit=200&page=1&sortBy=fullName&sortOrder=asc`)
      .set(bearer(adminToken));
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d).toHaveProperty("items");
    expect(d).toHaveProperty("total");
    expect(d.page).toBe(1);
    expect(d.limit).toBe(200);
    const names = d.items.map((s: { fullName: string }) => s.fullName);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("GET /students with no sortBy -> defaults to admissionNo ascending", async () => {
    const r = await request(app())
      .get(`${API}/students?limit=200&page=1`)
      .set(bearer(adminToken));
    expect(r.status).toBe(200);
    const nos = r.body.data.items.map((s: { admissionNo: string }) => s.admissionNo);
    const sorted = [...nos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    expect(nos).toEqual(sorted);
  });

  it("GET /students?limit=1 -> respects page size", async () => {
    const r = await request(app()).get(`${API}/students?limit=1&page=1`).set(bearer(adminToken));
    expect(r.status).toBe(200);
    expect(r.body.data.items.length).toBeLessThanOrEqual(1);
    expect(r.body.data.limit).toBe(1);
  });

  it("GET /students -> admissionDate is the earliest admission FeePayment date, else null", async () => {
    // Student with an admission payment: admissionDate reflects its paymentDate.
    const admNo = `QA-ADM-${Date.now()}`;
    const created = await request(app())
      .post(`${API}/students`)
      .set(bearer(adminToken))
      .send({ ...validStudent, admissionNo: admNo });
    const withAdmissionId = created.body.data.id;
    await request(app()).post(`${API}/fees`).set(bearer(adminToken)).send({
      studentId: withAdmissionId,
      feeType: "admission",
      feeYear: 2026,
      amountDue: 1000,
      amountPaid: 1000,
      paymentDate: "2026-05-20",
      paymentMethod: "cash",
    });

    // Student with no admission payment: admissionDate is null.
    const noAdmNo = `QA-NOADM-${Date.now()}`;
    const createdNoAdm = await request(app())
      .post(`${API}/students`)
      .set(bearer(adminToken))
      .send({ ...validStudent, admissionNo: noAdmNo });
    const noAdmissionId = createdNoAdm.body.data.id;

    const r = await request(app()).get(`${API}/students?limit=200&page=1`).set(bearer(adminToken));
    expect(r.status).toBe(200);
    const items = r.body.data.items as Array<{ id: number; admissionDate: string | null }>;
    const withRow = items.find((s) => s.id === withAdmissionId);
    const withoutRow = items.find((s) => s.id === noAdmissionId);
    expect(withRow?.admissionDate).not.toBeNull();
    expect(new Date(withRow!.admissionDate!).toISOString()).toBe(
      new Date("2026-05-20").toISOString()
    );
    expect(withoutRow).toHaveProperty("admissionDate", null);
  });

  it("GET /students/:id -> profile + fee summary + attendance stats", async () => {
    const r = await request(app()).get(`${API}/students/${createdId}`).set(bearer(adminToken));
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(createdId);
  });

  it("PATCH /students/:id -> updates fields", async () => {
    const r = await request(app())
      .patch(`${API}/students/${createdId}`)
      .set(bearer(adminToken))
      .send({ address: "Updated address" });
    expect(r.status).toBe(200);
  });

  it("GET /students/:id/receipt -> application/pdf (admission letter)", async () => {
    const r = await request(app()).get(`${API}/students/${createdId}/receipt`).set(bearer(adminToken));
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/application\/pdf/);
  });

  it("DELETE /students/:id -> soft delete (status=inactive)", async () => {
    const r = await request(app()).delete(`${API}/students/${createdId}`).set(bearer(adminToken));
    expect([200, 204]).toContain(r.status);
    const after = await request(app()).get(`${API}/students/${createdId}`).set(bearer(adminToken));
    expect(after.body.data.status).toBe("inactive");
  });

  it("Teacher cannot create/edit student profile -> 403 (§6 roles)", async () => {
    const r = await request(app()).post(`${API}/students`).set(bearer(teacherToken)).send(validStudent);
    expect(r.status).toBe(403);
  });

  it.todo("POST /students/import -> bulk import from uploaded .xlsx (multipart, 5MB/MIME guard)");
});
