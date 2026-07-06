import { Router } from "express";
import {
  studentCreateSchema,
  studentUpdateSchema,
  studentListQuery,
  type StudentListQuery,
} from "@makthab/shared";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody, validateQuery } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { renderPdf } from "../lib/pdf";

export const studentsRouter = Router();

studentsRouter.use(requireAuth);

// GET /students — paginated list with q / class_id / status filters.
studentsRouter.get(
  "/",
  validateQuery(studentListQuery),
  asyncHandler(async (_req, res) => {
    const q = res.locals.query as StudentListQuery;
    const where: Record<string, unknown> = {};
    if (q.class_id) where.classId = q.class_id;
    if (q.status) where.status = q.status;
    if (q.q) {
      where.OR = [
        { fullName: { contains: q.q } },
        { admissionNo: { contains: q.q } },
        { fatherName: { contains: q.q } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: { class: true, academicYear: true },
        orderBy: { id: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.student.count({ where }),
    ]);
    res.json({ data: { items, total, page: q.page, limit: q.limit } });
  })
);

// POST /students — admit a student (Admin only; §6 roles).
studentsRouter.post(
  "/",
  requireRole("Admin"),
  validateBody(studentCreateSchema),
  asyncHandler(async (req, res) => {
    const dto = req.body as typeof studentCreateSchema._output;
    const exists = await prisma.student.findUnique({ where: { admissionNo: dto.admissionNo } });
    if (exists) throw new AppError(409, "duplicate", `Admission number ${dto.admissionNo} already exists`);
    const student = await prisma.student.create({
      data: {
        admissionNo: dto.admissionNo,
        fullName: dto.fullName,
        fatherName: dto.fatherName,
        dateOfBirth: dto.dateOfBirth ?? null,
        gender: dto.gender,
        contactNo: dto.contactNo,
        whatsappNo: dto.whatsappNo,
        address: dto.address ?? null,
        classId: dto.classId,
        academicYearId: dto.academicYearId,
        photoPath: dto.photoPath ?? null,
        notes: dto.notes ?? null,
      },
      include: { class: true, academicYear: true },
    });
    res.status(201).json({ data: student });
  })
);

// GET /students/:id — profile + fee summary + attendance stats (§6.1).
studentsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true, academicYear: true },
    });
    if (!student) throw new AppError(404, "not_found", "Student not found");

    const fees = await prisma.feePayment.findMany({ where: { studentId: id } });
    const attendance = await prisma.attendance.groupBy({
      by: ["status"],
      where: { studentId: id },
      _count: { _all: true },
    });
    const attCounts = Object.fromEntries(attendance.map((a) => [a.status, a._count._all]));
    const totalMarked = attendance.reduce((s, a) => s + a._count._all, 0);
    const present = (attCounts.present ?? 0) + (attCounts.late ?? 0);

    res.json({
      data: {
        ...student,
        feeSummary: {
          totalPaid: fees.reduce((s, f) => s + f.amountPaid, 0),
          totalDue: fees.reduce((s, f) => s + f.amountDue, 0),
          payments: fees.length,
        },
        attendanceStats: {
          totalMarked,
          present: attCounts.present ?? 0,
          absent: attCounts.absent ?? 0,
          late: attCounts.late ?? 0,
          leave: attCounts.leave ?? 0,
          percentage: totalMarked ? Math.round((present / totalMarked) * 100) : 0,
        },
      },
    });
  })
);

// PATCH /students/:id — update fields (Admin only).
studentsRouter.patch(
  "/:id",
  requireRole("Admin"),
  validateBody(studentUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const exists = await prisma.student.findUnique({ where: { id } });
    if (!exists) throw new AppError(404, "not_found", "Student not found");
    const student = await prisma.student.update({
      where: { id },
      data: req.body,
      include: { class: true, academicYear: true },
    });
    res.json({ data: student });
  })
);

// DELETE /students/:id — soft delete (status = inactive).
studentsRouter.delete(
  "/:id",
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const exists = await prisma.student.findUnique({ where: { id } });
    if (!exists) throw new AppError(404, "not_found", "Student not found");
    await prisma.student.update({ where: { id }, data: { status: "inactive" } });
    res.json({ data: { id, status: "inactive" } });
  })
);

// GET /students/:id/receipt — admission letter PDF.
studentsRouter.get(
  "/:id/receipt",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true, academicYear: true },
    });
    if (!student) throw new AppError(404, "not_found", "Student not found");

    const pdf = renderPdf({
      title: "Admission Letter",
      subtitle: "Masjid-o-Madarasa — Makthab",
      lines: [
        ["Admission No", student.admissionNo],
        ["Name", student.fullName],
        ["Father's Name", student.fatherName],
        ["Class", student.class?.name ?? "-"],
        ["Academic Year", student.academicYear?.name ?? "-"],
        ["Gender", student.gender],
        ["Contact", student.contactNo],
        ["Status", student.status],
        "",
        "This letter confirms the admission of the above student.",
      ],
      footer: "Generated by Makthab",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="admission-${student.admissionNo}.pdf"`);
    res.end(pdf);
  })
);
