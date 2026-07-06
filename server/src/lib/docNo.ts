import { prisma } from "./prisma";

// Human-readable, unique document numbers. Counts are safe under the API's
// single-writer request handling; the unique DB constraint is the backstop.

function stamp(d = new Date()): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function nextReceiptNo(): Promise<string> {
  const n = await prisma.feePayment.count();
  return `RC-${stamp()}-${String(n + 1).padStart(4, "0")}`;
}

export async function nextVoucherNo(): Promise<string> {
  const n = await prisma.expense.count();
  return `EXP-${stamp()}-${String(n + 1).padStart(4, "0")}`;
}
