import type { Request } from "express";
import { AppError } from "../middleware/errorHandler";

// The Staff.id of the logged-in user, stamped on write operations
// (FeePayment.collectedById, Attendance.markedById, Expense.approvedById).
export function actorStaffId(req: Request): number {
  const id = req.user?.staffId;
  if (!id) throw new AppError(401, "unauthorized", "No authenticated actor");
  return id;
}
