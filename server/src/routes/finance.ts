import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  expenseCreateSchema,
  expenseListQuery,
  staffCreateSchema,
  salaryRunSchema,
  type ExpenseListQuery,
} from "@makthab/shared";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody, validateQuery } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { actorStaffId } from "../lib/actor";
import { nextVoucherNo } from "../lib/docNo";

// ---- Expenses (Admin, Accountant) ------------------------------------------
export const expensesRouter = Router();
expensesRouter.use(requireAuth, requireRole("Admin", "Accountant"));

expensesRouter.post(
  "/",
  validateBody(expenseCreateSchema),
  asyncHandler(async (req, res) => {
    const dto = req.body as typeof expenseCreateSchema._output;
    const voucherNo = await nextVoucherNo();
    const expense = await prisma.expense.create({
      data: {
        voucherNo,
        categoryId: dto.categoryId,
        amount: dto.amount,
        expenseDate: dto.expenseDate,
        payee: dto.payee,
        description: dto.description ?? null,
        receiptScanPath: dto.receiptScanPath ?? null,
        approvedById: actorStaffId(req),
      },
      include: { category: true },
    });
    res.status(201).json({ data: expense });
  })
);

expensesRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const period = req.query.period ? Number(req.query.period) : undefined;
    const where = period
      ? { expenseDate: { gte: new Date(period, 0, 1), lt: new Date(period + 1, 0, 1) } }
      : {};
    const grouped = await prisma.expense.groupBy({
      by: ["categoryId"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
    const categories = await prisma.expenseCategory.findMany();
    const byName = new Map(categories.map((c) => [c.id, c.name]));
    res.json({
      data: grouped.map((g) => ({
        categoryId: g.categoryId,
        category: byName.get(g.categoryId) ?? String(g.categoryId),
        total: g._sum.amount ?? 0,
        count: g._count._all,
      })),
    });
  })
);

expensesRouter.get(
  "/",
  validateQuery(expenseListQuery),
  asyncHandler(async (_req, res) => {
    const q = res.locals.query as ExpenseListQuery;
    const where: Record<string, unknown> = {};
    if (q.category_id) where.categoryId = q.category_id;
    if (q.date_from || q.date_to) {
      where.expenseDate = {
        ...(q.date_from ? { gte: new Date(q.date_from) } : {}),
        ...(q.date_to ? { lte: new Date(q.date_to) } : {}),
      };
    }
    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { id: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.expense.count({ where }),
    ]);
    res.json({ data: { items, total, page: q.page, limit: q.limit } });
  })
);

// ---- Staff (Admin, Accountant) ---------------------------------------------
export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole("Admin", "Accountant"));

staffRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await prisma.staff.findMany({ orderBy: { id: "asc" } });
    res.json({ data: items });
  })
);

staffRouter.post(
  "/",
  requireRole("Admin"),
  validateBody(staffCreateSchema),
  asyncHandler(async (req, res) => {
    const dto = req.body as typeof staffCreateSchema._output;
    const staff = await prisma.staff.create({
      data: {
        fullName: dto.fullName,
        role: dto.role,
        baseSalary: dto.baseSalary,
        contactNo: dto.contactNo,
        whatsappNo: dto.whatsappNo,
      },
    });
    // Optionally provision an app login for this staff member.
    if (dto.username && dto.password && dto.appRole) {
      const passwordHash = await bcrypt.hash(dto.password, 12);
      await prisma.user.create({
        data: { username: dto.username, passwordHash, role: dto.appRole, staffId: staff.id },
      });
    }
    res.status(201).json({ data: staff });
  })
);

// ---- Salaries (Admin, Accountant) ------------------------------------------
export const salariesRouter = Router();
salariesRouter.use(requireAuth, requireRole("Admin", "Accountant"));

salariesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const where: Record<string, unknown> = {};
    if (req.query.month) where.salaryMonth = Number(req.query.month);
    if (req.query.year) where.salaryYear = Number(req.query.year);
    if (req.query.staff_id) where.staffId = Number(req.query.staff_id);
    const items = await prisma.salaryPayment.findMany({
      where,
      include: { staff: true },
      orderBy: { id: "desc" },
    });
    res.json({ data: items });
  })
);

// POST /salaries — run payroll for one staff member or all active staff.
salariesRouter.post(
  "/",
  validateBody(salaryRunSchema),
  asyncHandler(async (req, res) => {
    const dto = req.body as typeof salaryRunSchema._output;
    const staffList = dto.staffId
      ? await prisma.staff.findMany({ where: { id: dto.staffId } })
      : await prisma.staff.findMany({ where: { status: "active" } });
    if (staffList.length === 0) throw new AppError(404, "not_found", "No staff to process");

    const paymentDate = dto.paymentDate ?? new Date();
    const payments = [];
    for (const staff of staffList) {
      const gross = staff.baseSalary;
      const net = Math.max(0, gross - dto.deductions);
      const payment = await prisma.salaryPayment.upsert({
        where: {
          staffId_salaryMonth_salaryYear: {
            staffId: staff.id,
            salaryMonth: dto.salaryMonth,
            salaryYear: dto.salaryYear,
          },
        },
        update: { grossAmount: gross, deductions: dto.deductions, netAmount: net, paymentDate },
        create: {
          staffId: staff.id,
          salaryMonth: dto.salaryMonth,
          salaryYear: dto.salaryYear,
          grossAmount: gross,
          deductions: dto.deductions,
          netAmount: net,
          paymentDate,
        },
        include: { staff: true },
      });
      payments.push(payment);
    }
    res.status(201).json({ data: { processed: payments.length, payments } });
  })
);
