import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import {
  feePaymentCreateSchema,
  feeListQuery,
  defaultersQuery,
  feeStructureCreateSchema,
  type FeeListQuery,
  type DefaultersQuery,
} from "@makthab/shared";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody, validateQuery } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { actorStaffId } from "../lib/actor";
import { nextReceiptNo } from "../lib/docNo";
import { renderPdf } from "../lib/pdf";
import { buildWhatsAppLink } from "../lib/whatsapp";
import { RECEIPTS_DIR, ensureDir } from "../lib/paths";

export const feesRouter = Router();

feesRouter.use(requireAuth, requireRole("Admin", "Accountant"));

type FeeWithStudent = Awaited<ReturnType<typeof loadFee>>;
async function loadFee(id: number) {
  return prisma.feePayment.findUnique({ where: { id }, include: { student: true } });
}

function receiptPdf(fee: NonNullable<FeeWithStudent>): Buffer {
  return renderPdf({
    title: "Fee Receipt",
    subtitle: `Receipt No: ${fee.receiptNo}`,
    lines: [
      ["Student", fee.student?.fullName ?? "-"],
      ["Admission No", fee.student?.admissionNo ?? "-"],
      ["Fee Type", fee.feeType],
      ["Period", fee.feeMonth ? `${fee.feeMonth}/${fee.feeYear}` : String(fee.feeYear)],
      ["Amount Due", fee.amountDue.toFixed(2)],
      ["Amount Paid", fee.amountPaid.toFixed(2)],
      ["Waiver", fee.waiverAmount.toFixed(2)],
      ["Method", fee.paymentMethod],
      ["Date", new Date(fee.paymentDate).toISOString().slice(0, 10)],
    ],
    footer: "Thank you. — Makthab",
  });
}

// POST /fees — record a payment and generate the receipt PDF.
feesRouter.post(
  "/",
  validateBody(feePaymentCreateSchema),
  asyncHandler(async (req, res) => {
    const dto = req.body as typeof feePaymentCreateSchema._output;
    const student = await prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new AppError(404, "not_found", "Student not found");

    const receiptNo = await nextReceiptNo();
    const created = await prisma.feePayment.create({
      data: {
        receiptNo,
        studentId: dto.studentId,
        feeType: dto.feeType,
        feeMonth: dto.feeMonth ?? null,
        feeYear: dto.feeYear,
        amountDue: dto.amountDue,
        amountPaid: dto.amountPaid,
        paymentDate: dto.paymentDate,
        paymentMethod: dto.paymentMethod,
        waiverAmount: dto.waiverAmount ?? 0,
        collectedById: actorStaffId(req),
      },
      include: { student: true },
    });

    const pdfPath = path.join(ensureDir(RECEIPTS_DIR), `${receiptNo}.pdf`);
    fs.writeFileSync(pdfPath, receiptPdf(created));
    const fee = await prisma.feePayment.update({
      where: { id: created.id },
      data: { pdfPath },
      include: { student: true },
    });

    res.status(201).json({ data: fee });
  })
);

// GET /fees/defaulters — active students with no monthly payment for month/year.
feesRouter.get(
  "/defaulters",
  validateQuery(defaultersQuery),
  asyncHandler(async (_req, res) => {
    const { month, year } = res.locals.query as DefaultersQuery;
    const students = await prisma.student.findMany({
      where: { status: "active" },
      include: { class: true },
    });
    const paid = await prisma.feePayment.findMany({
      where: { feeType: "monthly", feeMonth: month, feeYear: year },
      select: { studentId: true },
    });
    const paidSet = new Set(paid.map((p) => p.studentId));
    const structures = await prisma.feeStructure.findMany({ where: { feeType: "monthly" } });
    const structFor = (classId: number, yearId: number) =>
      structures.find((s) => s.classId === classId && s.academicYearId === yearId)?.amount ?? 0;

    const defaulters = students
      .filter((s) => !paidSet.has(s.id))
      .map((s) => ({
        studentId: s.id,
        fullName: s.fullName,
        admissionNo: s.admissionNo,
        className: s.class?.name,
        amountDue: structFor(s.classId, s.academicYearId),
        whatsappNo: s.whatsappNo,
      }));
    res.json({ data: defaulters });
  })
);

// GET /fees/structures — list; POST /fees/structures — upsert.
feesRouter.get(
  "/structures",
  asyncHandler(async (_req, res) => {
    const items = await prisma.feeStructure.findMany({
      include: { academicYear: true },
      orderBy: { id: "asc" },
    });
    res.json({ data: items });
  })
);

feesRouter.post(
  "/structures",
  validateBody(feeStructureCreateSchema),
  asyncHandler(async (req, res) => {
    const dto = req.body as typeof feeStructureCreateSchema._output;
    const item = await prisma.feeStructure.upsert({
      where: {
        classId_academicYearId_feeType: {
          classId: dto.classId,
          academicYearId: dto.academicYearId,
          feeType: dto.feeType,
        },
      },
      update: { amount: dto.amount },
      create: dto,
    });
    res.status(201).json({ data: item });
  })
);

// GET /fees — list with student_id / month / year / status filters.
feesRouter.get(
  "/",
  validateQuery(feeListQuery),
  asyncHandler(async (_req, res) => {
    const q = res.locals.query as FeeListQuery;
    const where: Record<string, unknown> = {};
    if (q.student_id) where.studentId = q.student_id;
    if (q.month) where.feeMonth = q.month;
    if (q.year) where.feeYear = q.year;
    const rows = await prisma.feePayment.findMany({
      where,
      include: { student: true },
      orderBy: { id: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });
    const items =
      q.status === "paid"
        ? rows.filter((r) => r.amountPaid >= r.amountDue)
        : q.status === "unpaid"
        ? rows.filter((r) => r.amountPaid < r.amountDue)
        : rows;
    const agg = await prisma.feePayment.aggregate({ _sum: { amountPaid: true }, where });
    const totalPaid = agg._sum.amountPaid ?? 0;
    res.json({ data: { items, total: items.length, page: q.page, limit: q.limit, totalPaid } });
  })
);

// GET /fees/:id — one payment record.
feesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const fee = await loadFee(Number(req.params.id));
    if (!fee) throw new AppError(404, "not_found", "Payment not found");
    res.json({ data: fee });
  })
);

// GET /fees/:id/receipt — stream the receipt PDF.
feesRouter.get(
  "/:id/receipt",
  asyncHandler(async (req, res) => {
    const fee = await loadFee(Number(req.params.id));
    if (!fee) throw new AppError(404, "not_found", "Payment not found");
    const pdf =
      fee.pdfPath && fs.existsSync(fee.pdfPath) ? fs.readFileSync(fee.pdfPath) : receiptPdf(fee);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fee.receiptNo}.pdf"`);
    res.end(pdf);
  })
);

// POST /fees/:id/whatsapp — build a wa.me link and mark as sent.
feesRouter.post(
  "/:id/whatsapp",
  asyncHandler(async (req, res) => {
    const fee = await loadFee(Number(req.params.id));
    if (!fee) throw new AppError(404, "not_found", "Payment not found");
    const message =
      `Assalamu Alaikum. Fee receipt ${fee.receiptNo} for ${fee.student?.fullName ?? ""}: ` +
      `${fee.amountPaid.toFixed(2)} paid on ${new Date(fee.paymentDate).toISOString().slice(0, 10)}. JazakAllah.`;
    const link = buildWhatsAppLink(fee.student?.whatsappNo ?? "", message);
    await prisma.feePayment.update({ where: { id: fee.id }, data: { whatsappSent: true } });
    res.json({ data: { link, whatsappSent: true } });
  })
);
