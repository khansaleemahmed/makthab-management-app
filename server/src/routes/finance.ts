import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  expenseListQuery,
  staffCreateSchema,
  staffListQuery,
  salaryRunSchema,
  salaryListQuery,
  type ExpenseListQuery,
  type StaffListQuery,
  type SalaryListQuery,
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
        cost: dto.cost,
        quantity: dto.quantity,
        amount: dto.cost * dto.quantity,
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

// PATCH /expenses/:id — edit an entry (Admin only). amount is re-derived from
// the effective cost * quantity; a client-sent amount is never trusted.
expensesRouter.patch(
  "/:id",
  requireRole("Admin"),
  validateBody(expenseUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "not_found", "Expense not found");

    const dto = req.body as typeof expenseUpdateSchema._output;
    const cost = dto.cost ?? existing.cost;
    const quantity = dto.quantity ?? existing.quantity;
    const amount =
      cost !== null && quantity !== null ? cost * quantity : existing.amount;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        amount,
        ...(dto.expenseDate !== undefined ? { expenseDate: dto.expenseDate } : {}),
        ...(dto.payee !== undefined ? { payee: dto.payee } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        ...(dto.receiptScanPath !== undefined
          ? { receiptScanPath: dto.receiptScanPath ?? null }
          : {}),
      },
      include: { category: true },
    });
    res.json({ data: expense });
  })
);

// DELETE /expenses/:id — hard delete (Admin only). No model FKs onto Expense.
expensesRouter.delete(
  "/:id",
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "not_found", "Expense not found");
    await prisma.expense.delete({ where: { id } });
    res.json({ data: { id } });
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
    const orderBy = q.sortBy
      ? q.sortBy === "category"
        ? { category: { name: q.sortOrder } }
        : { [q.sortBy]: q.sortOrder }
      : { id: "desc" as const };
    const [items, total, agg] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ _sum: { amount: true }, where }),
    ]);
    const totalAmount = agg._sum.amount ?? 0;
    res.json({ data: { items, total, page: q.page, limit: q.limit, totalAmount } });
  })
);

// ---- Staff (Admin, Accountant) ---------------------------------------------
export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole("Admin", "Accountant"));

staffRouter.get(
  "/",
  validateQuery(staffListQuery),
  asyncHandler(async (_req, res) => {
    const q = res.locals.query as StaffListQuery;
    const orderBy = q.sortBy
      ? { [q.sortBy]: q.sortOrder }
      : { fullName: "asc" as const };
    const [items, total] = await Promise.all([
      prisma.staff.findMany({
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.staff.count(),
    ]);
    res.json({ data: { items, total, page: q.page, limit: q.limit } });
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
  validateQuery(salaryListQuery),
  asyncHandler(async (_req, res) => {
    const q = res.locals.query as SalaryListQuery;
    const where: Record<string, unknown> = {};
    if (q.month) where.salaryMonth = q.month;
    if (q.year) where.salaryYear = q.year;
    if (q.staff_id) where.staffId = q.staff_id;
    const orderBy = q.sortBy
      ? q.sortBy === "staff"
        ? { staff: { fullName: q.sortOrder } }
        : { [q.sortBy]: q.sortOrder }
      : { id: "desc" as const };
    const [items, total] = await Promise.all([
      prisma.salaryPayment.findMany({
        where,
        include: { staff: true },
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.salaryPayment.count({ where }),
    ]);
    res.json({ data: { items, total, page: q.page, limit: q.limit } });
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
