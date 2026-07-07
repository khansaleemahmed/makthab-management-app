/**
 * Client-side FORM schemas.
 *
 * The canonical API-contract schemas live in `@makthab/shared` and are what
 * Backend validates against. Those schemas expect already-typed JSON values
 * (numbers, Dates); HTML form controls emit strings. This module composes
 * form-friendly schemas that COERCE strings and REUSE the shared enum schemas,
 * so enum values (gender, feeType, paymentMethod, status…) can never drift
 * from the server contract. Payloads produced here conform to the matching
 * shared DTO at runtime (dates are ISO strings, which the server coerces).
 */
import { z } from 'zod';
import {
  genderSchema,
  feeTypeSchema,
  paymentMethodSchema,
  attendanceStatusSchema,
  studentStatusSchema,
} from '@makthab/shared';

const requiredDate = z.string().min(1, 'Required');

export const studentCreateSchema = z.object({
  admissionNo: z.string().trim().min(1, 'Required'),
  fullName: z.string().trim().min(1, 'Required'),
  fatherName: z.string().trim().min(1, 'Required'),
  dateOfBirth: requiredDate,
  gender: genderSchema,
  contactNo: z.string().trim().min(7, 'Enter a valid number'),
  whatsappNo: z.string().trim().min(7, 'Enter a valid number'),
  address: z.string().trim().optional(),
  classId: z.coerce.number().int().positive('Select a class'),
  academicYearId: z.coerce.number().int().positive('Select a year'),
  status: studentStatusSchema.default('active'),
});
export type StudentCreateInput = z.infer<typeof studentCreateSchema>;

export const classCreateSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  teacherId: z
    .preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().positive())
    .optional(),
});
export type ClassCreateInput = z.infer<typeof classCreateSchema>;

export const feePaymentCreateSchema = z.object({
  studentId: z.coerce.number().int().positive('Select a student'),
  feeType: feeTypeSchema,
  feeMonth: z.coerce.number().int().min(1).max(12).optional(),
  feeYear: z.coerce.number().int().min(2000).max(2100),
  amountDue: z.coerce.number().nonnegative(),
  amountPaid: z.coerce.number().nonnegative(),
  waiverAmount: z.coerce.number().nonnegative().default(0),
  paymentDate: requiredDate,
  paymentMethod: paymentMethodSchema,
});
export type FeePaymentCreateInput = z.infer<typeof feePaymentCreateSchema>;

export const feeStructureCreateSchema = z.object({
  classId: z.coerce.number().int().positive('Select a class'),
  academicYearId: z.coerce.number().int().positive('Select a year'),
  feeType: feeTypeSchema,
  amount: z.coerce.number().nonnegative(),
});
export type FeeStructureCreateInput = z.infer<typeof feeStructureCreateSchema>;

export const attendanceRecordSchema = z.object({
  studentId: z.number().int().positive(),
  status: attendanceStatusSchema,
  notes: z.string().optional(),
});
export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;

export const expenseCreateSchema = z.object({
  categoryId: z.coerce.number().int().positive('Select a category'),
  amount: z.coerce.number().positive(),
  expenseDate: requiredDate,
  payee: z.string().trim().min(1, 'Required'),
  description: z.string().optional(),
});
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;

export const staffCreateSchema = z.object({
  fullName: z.string().trim().min(1, 'Required'),
  role: z.string().trim().min(1, 'Required'),
  baseSalary: z.coerce.number().nonnegative(),
  contactNo: z.string().trim().min(7, 'Enter a valid number'),
  whatsappNo: z.string().trim().min(7, 'Enter a valid number'),
});
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

export const salaryRunSchema = z.object({
  staffId: z.coerce.number().int().positive().optional(),
  salaryMonth: z.coerce.number().int().min(1).max(12),
  salaryYear: z.coerce.number().int().min(2000).max(2100),
  deductions: z.coerce.number().nonnegative().default(0),
  paymentDate: requiredDate,
});
export type SalaryRunInput = z.infer<typeof salaryRunSchema>;
