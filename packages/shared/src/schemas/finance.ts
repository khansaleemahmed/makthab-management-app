import { z } from "zod";
import { phoneSchema } from "./common";

// ExpenseCreateDto — POST /expenses
export const expenseCreateSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().nonnegative(),
  expenseDate: z.coerce.date(),
  payee: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  receiptScanPath: z.string().optional().nullable(),
});
export type ExpenseCreateDto = z.infer<typeof expenseCreateSchema>;

export const expenseListQuery = z.object({
  category_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
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

// POST /salaries — process a payroll run for one staff member or all.
export const salaryRunSchema = z.object({
  staffId: z.number().int().positive().optional(), // omit => all active staff
  salaryMonth: z.number().int().min(1).max(12),
  salaryYear: z.number().int().min(2000).max(2100),
  deductions: z.number().nonnegative().default(0),
  paymentDate: z.coerce.date().optional(),
});
export type SalaryRunDto = z.infer<typeof salaryRunSchema>;

export type ExpenseDto = {
  id: number;
  voucherNo: string;
  categoryId: number;
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
