import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";

// GET /dashboard — headline KPIs for the landing page.
export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totalStudents, todayAttendance, monthFees, recentFees] = await Promise.all([
      prisma.student.count({ where: { status: "active" } }),
      prisma.attendance.findMany({ where: { date: { gte: todayStart, lt: todayEnd } } }),
      prisma.feePayment.aggregate({
        _sum: { amountPaid: true },
        where: { paymentDate: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.feePayment.findMany({
        take: 8,
        orderBy: { id: "desc" },
        include: { student: true },
      }),
    ]);

    const todayPresent = todayAttendance.filter((a) => a.status === "present" || a.status === "late").length;
    const todayAbsent = todayAttendance.filter((a) => a.status === "absent").length;

    // Outstanding = active students without a payment this month × avg monthly fee.
    const paidThisMonth = await prisma.feePayment.findMany({
      where: { feeType: "monthly", paymentDate: { gte: monthStart, lt: monthEnd } },
      select: { studentId: true },
    });
    const structures = await prisma.feeStructure.findMany({ where: { feeType: "monthly" } });
    const avgFee = structures.length
      ? structures.reduce((s, f) => s + f.amount, 0) / structures.length
      : 0;
    const unpaidCount = Math.max(0, totalStudents - new Set(paidThisMonth.map((p) => p.studentId)).size);

    res.json({
      data: {
        totalStudents,
        todayPresent,
        todayAbsent,
        monthCollection: monthFees._sum.amountPaid ?? 0,
        outstanding: Math.round(unpaidCount * avgFee),
        recentActivity: recentFees.map((f) => ({
          id: f.id,
          type: "fee",
          description: `${f.student?.fullName ?? "Student"} paid ${f.amountPaid.toFixed(2)} (${f.receiptNo})`,
          date: new Date(f.createdAt).toISOString(),
        })),
      },
    });
  })
);
