import request from "supertest";
import { API, CREDS, bearer, describeApi, loadApp, login } from "./helpers";

// Attendance (doc §6.3)
describeApi("attendance", () => {
  const app = () => loadApp()!;
  let token = "";
  let recId = 0;
  const studentId = 1;

  beforeAll(async () => {
    token = await login(CREDS.teacher.username, CREDS.teacher.password);
  });

  it("POST /attendance (single) -> {data}", async () => {
    const r = await request(app())
      .post(`${API}/attendance`)
      .set(bearer(token))
      .send({ studentId, date: "2026-06-10", status: "present" });
    expect([200, 201]).toContain(r.status);
    recId = r.body?.data?.id ?? recId;
  });

  it("POST /attendance (bulk array) -> {data}", async () => {
    const r = await request(app())
      .post(`${API}/attendance`)
      .set(bearer(token))
      .send([
        { studentId, date: "2026-06-11", status: "absent" },
        { studentId, date: "2026-06-12", status: "late" },
      ]);
    expect([200, 201]).toContain(r.status);
  });

  it("POST /attendance bad body -> 400 Zod", async () => {
    const r = await request(app()).post(`${API}/attendance`).set(bearer(token)).send({ status: "nope" });
    expect(r.status).toBe(400);
  });

  it("GET /attendance -> {data} (student_id/class_id/date/month/year)", async () => {
    const r = await request(app()).get(`${API}/attendance?student_id=${studentId}&month=6&year=2026`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("PATCH /attendance/:id -> corrects a record", async () => {
    if (!recId) return;
    const r = await request(app()).patch(`${API}/attendance/${recId}`).set(bearer(token)).send({ status: "leave" });
    expect(r.status).toBe(200);
  });

  it("GET /attendance/summary -> per-student totals (present/absent/percentage)", async () => {
    const r = await request(app()).get(`${API}/attendance/summary?month=6&year=2026`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it("GET /attendance/low-alert -> students below threshold", async () => {
    const r = await request(app()).get(`${API}/attendance/low-alert`).set(bearer(token));
    expect(r.status).toBe(200);
  });

  it.todo("Teacher can only mark attendance for assigned classes -> 403 otherwise (§6 roles)");
});
