/**
 * QA end-to-end smoke — BUILD_CONTRACT §7 happy path against a LIVE server.
 *
 * Prereq: server running on :3000 with a migrated + seeded DB.
 *   Run:  node server/tests/e2e-smoke.mjs  [baseUrl]
 *   Default baseUrl: http://localhost:3000/api/v1
 *
 * Steps: health -> login -> admit student -> collect fee (receipt PDF) ->
 *        mark attendance -> add expense -> run a report (PDF/XLSX).
 * Exits non-zero on first failure. This is the runnable checklist behind DoD #10.
 */
const BASE = process.argv[2] || "http://localhost:3000/api/v1";
const ROOT = BASE.replace(/\/api\/v1$/, "");
const CREDS = { username: "admin", password: "admin123" };

let pass = 0;
let token = "";
const step = async (name, fn) => {
  try {
    await fn();
    pass++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    console.error(`  FAIL  ${name}\n        ${e.message}`);
    process.exit(1);
  }
};
const auth = () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const run = async () => {
  console.log(`QA e2e smoke -> ${BASE}\n`);

  await step("GET /health -> 200 {data}", async () => {
    const r = await fetch(`${ROOT}/health`);
    expect(r.status === 200, `status ${r.status}`);
    const b = await r.json();
    expect(b.data, "missing {data} envelope");
  });

  await step("POST /auth/login -> accessToken", async () => {
    const r = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(CREDS),
    });
    expect(r.status === 200, `status ${r.status}`);
    const b = await r.json();
    token = b.data?.accessToken;
    expect(token, "no accessToken in response");
  });

  let studentId;
  await step("POST /students -> admit student", async () => {
    const r = await fetch(`${BASE}/students`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        admissionNo: `SMOKE-${Date.now()}`,
        fullName: "Smoke Student",
        fatherName: "Smoke Father",
        gender: "male",
        contactNo: "9990001234",
        whatsappNo: "9990001234",
        classId: 1,
        academicYearId: 2,
      }),
    });
    expect([200, 201].includes(r.status), `status ${r.status}`);
    const b = await r.json();
    studentId = b.data?.id;
    expect(studentId, "no student id");
  });

  let feeId;
  await step("POST /fees -> collect fee (receipt PDF generated)", async () => {
    const r = await fetch(`${BASE}/fees`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        studentId,
        feeType: "monthly",
        feeMonth: 6,
        feeYear: 2026,
        amountDue: 500,
        amountPaid: 500,
        paymentDate: new Date().toISOString(),
        paymentMethod: "cash",
      }),
    });
    expect([200, 201].includes(r.status), `status ${r.status}`);
    const b = await r.json();
    feeId = b.data?.id;
    expect(b.data?.receiptNo, "no receiptNo");
  });

  await step("GET /fees/:id/receipt -> application/pdf", async () => {
    const r = await fetch(`${BASE}/fees/${feeId}/receipt`, { headers: auth() });
    expect(r.status === 200, `status ${r.status}`);
    expect(/application\/pdf/.test(r.headers.get("content-type") || ""), "not a PDF");
  });

  await step("POST /attendance -> mark attendance", async () => {
    const r = await fetch(`${BASE}/attendance`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ studentId, date: new Date().toISOString(), status: "present" }),
    });
    expect([200, 201].includes(r.status), `status ${r.status}`);
  });

  await step("POST /expenses -> add expense (voucher)", async () => {
    const r = await fetch(`${BASE}/expenses`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        categoryId: 1,
        amount: 750,
        expenseDate: new Date().toISOString(),
        payee: "Smoke Vendor",
      }),
    });
    expect([200, 201].includes(r.status), `status ${r.status}`);
  });

  await step("GET /reports/fee-collection -> PDF", async () => {
    const r = await fetch(`${BASE}/reports/fee-collection?month=6&year=2026`, { headers: auth() });
    expect(r.status === 200, `status ${r.status}`);
    const ct = r.headers.get("content-type") || "";
    expect(/application\/pdf|spreadsheetml/.test(ct), `unexpected content-type: ${ct}`);
  });

  await step("GET /reports/fee-collection?format=xlsx -> XLSX", async () => {
    const r = await fetch(`${BASE}/reports/fee-collection?month=6&year=2026&format=xlsx`, { headers: auth() });
    expect(r.status === 200, `status ${r.status}`);
    expect(/spreadsheetml/.test(r.headers.get("content-type") || ""), "not an xlsx");
  });

  console.log(`\nAll ${pass} smoke steps passed.`);
};

run().catch((e) => {
  console.error("SMOKE ERROR:", e);
  process.exit(1);
});
