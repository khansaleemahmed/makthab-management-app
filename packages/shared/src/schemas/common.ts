import { z } from "zod";

// Roles used across auth + access control (BUILD_CONTRACT §6).
export const RoleSchema = z.enum(["Admin", "Accountant", "Teacher"]);
export type Role = z.infer<typeof RoleSchema>;

// Reusable primitives.
export const idParam = z.coerce.number().int().positive();

// Phone: digits only, 7-15 length (spaces stripped upstream).
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9+]{7,15}$/, "Invalid phone number");

export const genderSchema = z.enum(["male", "female"]);

export const paymentMethodSchema = z.enum([
  "cash",
  "upi",
  "bank",
  "cheque",
  "card",
  "unknown",
]);

export const studentStatusSchema = z.enum(["active", "inactive"]);

export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
  "leave",
]);

export const feeTypeSchema = z.enum(["admission", "monthly", "annual", "other"]);

// Sort direction shared by sortable list endpoints.
export const sortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof sortOrderSchema>;

// Pagination query shared by list endpoints.
export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

// Standard API envelopes (BUILD_CONTRACT §2).
export type ApiSuccess<T> = { data: T };
export type ApiError = {
  error: { code: string; message: string; details?: unknown };
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
