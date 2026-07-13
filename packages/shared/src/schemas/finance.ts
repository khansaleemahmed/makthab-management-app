import { z } from "zod";
import { phoneSchema, sortOrderSchema } from "./common";

// ExpenseCreateDto — POST /expenses
// amount is derived server-side (cost * quantity); it is not accepted from the client.
export const expenseCreateSchema = z.object({
  categoryId: z.number().int().positive(),
  cost: z.number().positive(),
  quantity: z.number().positive(),
  expenseDate: z.coerce.date(),
  payee: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  receiptScanPath: z.string().optional().nullable(),
});
export type ExpenseCreateDto = z.infer<typeof expenseCreateSchema>;

// ExpenseUpdateDto — PATCH /expenses/:id (partial; amount stays server-derived)
export const expenseUpdateSchema = expenseCreateSchema.partial();
export type ExpenseUpdateDto = z.infer<typeof expenseUpdateSchema>;

export const expenseSortField = z.enum([
  "voucherNo",
  "payee",
  "cost",
  "quantity",
  "amount",
  "expenseDate",
  "category",
]);
export type ExpenseSortField = z.infer<typeof expenseSortField>;

export const expenseListQuery = z.object({
  category_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  sortBy: expenseSortField.optional(),
  sortOrder: sortOrderSchema.default("asc"),
});
export type ExpenseListQuery = z.infer<typeof expenseListQuery>;

// StaffCreateDto — POST /staff
export const staffCreateSchema = z.object({
  fullName: z.string().trim().min(1),
  role: z.string().trim().min(1),
  baseSalary: z.number().nonnegative(),
  contactNo: phoneSchema,
  whatsappNo: phoneSchema,
  // Optional login credentials — a staff member may also be an app user.
  username: z.string().trim().min(1).optional(),
  password: z.string().min(6).optional(),
  appRole: z.enum(["Admin", "Accountant", "Teacher"]).optional(),
});
export type StaffCreateDto = z.infer<typeof staffCreateSchema>;

// GET /staff query params
export const staffSortField = z.enum(["fullName", "role", "baseSalary"]);
export type StaffSortField = z.infer<typeof staffSortField>;

export const staffListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  sortBy: staffSortField.optional(),
  sortOrder: sortOrderSchema.default("asc"),
});
export type StaffListQuery = z.infer<typeof staffListQuery>;

// POST /salaries — process a payroll run for one staff member or all.
export const salaryRunSchema = z.object({
  staffId: z.number().int().positive().optional(), // omit => all active staff
  salaryMonth: z.number().int().min(1).max(12),
  salaryYear: z.number().int().min(2000).max(2100),
  deductions: z.number().nonnegative().default(0),
  paymentDate: z.coerce.date().optional(),
});
export type SalaryRunDto = z.infer<typeof salaryRunSchema>;

// GET /salaries query params
export const salarySortField = z.enum([
  "staff",
  "salaryMonth",
  "salaryYear",
  "grossAmount",
  "deductions",
  "netAmount",
]);
export type SalarySortField = z.infer<typeof salarySortField>;

export const salaryListQuery = z.object({
  staff_id: z.coerce.number().int().positive().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  sortBy: salarySortField.optional(),
  sortOrder: sortOrderSchema.default("asc"),
});
export type SalaryListQuery = z.infer<typeof salaryListQuery>;

export type ExpenseDto = {
  id: number;
  voucherNo: string;
  categoryId: number;
  cost: number | null;
  quantity: number | null;
  amount: number;
  expenseDate: string;
  payee: string;
  description: string | null;
  receiptScanPath: string | null;
  approvedById: number;
  createdAt: string;
};

export type StaffDto = {
  id: number;
  fullName: string;
  role: string;
  baseSalary: number;
  contactNo: string;
  whatsappNo: string;
  status: string;
  createdAt: string;
};
