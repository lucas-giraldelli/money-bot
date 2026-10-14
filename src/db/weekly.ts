import db from "./connection";
import type { Bill } from "./bills";
import { dueDatesBetween, dueDatesInMonth, DEFAULT_WEEKDAY } from "../lib/weekly";

export type WeeklyPayment = {
  id: number;
  bill_id: number;
  amount: number;
  weeks: number;
  prev_paid_through: string;
  paid_through: string;
  month: string;
  paid_at: string;
  paid_by: string | null;
};

export type WeeklyStatus = {
  weekday: number;
  paidThrough: string;
  pending: string[];      // due dates in (paid_through, today]
  monthDues: string[];    // every due date in the current month
  upcoming: string[];     // due dates still ahead this month
  paidInMonth: number;    // how many of monthDues are covered
};

export function getWeeklyStatus(bill: Bill, today: string, month: string): WeeklyStatus {
  const weekday = bill.weekday ?? DEFAULT_WEEKDAY;
  const paidThrough = bill.paid_through ?? today;
  const pending = dueDatesBetween(paidThrough, today, weekday);
  const monthDues = dueDatesInMonth(month, weekday);
  return {
    weekday,
    paidThrough,
    pending,
    monthDues,
    upcoming: monthDues.filter((d) => d > today && d > paidThrough),
    paidInMonth: monthDues.filter((d) => d <= paidThrough).length,
  };
}

export function payWeekly(bill: Bill, status: WeeklyStatus, month: string, paidBy: string): number {
  const amount = bill.amount * status.pending.length;
  const newPaidThrough = status.pending[status.pending.length - 1];
  db.transaction(() => {
    db.prepare(
      `INSERT INTO weekly_payments (bill_id, amount, weeks, prev_paid_through, paid_through, month, paid_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(bill.id, amount, status.pending.length, status.paidThrough, newPaidThrough, month, paidBy);
    db.prepare("UPDATE bills SET paid_through = ? WHERE id = ?").run(newPaidThrough, bill.id);
  })();
  return amount;
}

export function getLastWeeklyPayment(billId: number): WeeklyPayment | undefined {
  return db
    .prepare("SELECT * FROM weekly_payments WHERE bill_id = ? ORDER BY id DESC LIMIT 1")
    .get(billId) as WeeklyPayment | undefined;
}

export function undoWeeklyPayment(payment: WeeklyPayment): void {
  db.transaction(() => {
    db.prepare("UPDATE bills SET paid_through = ? WHERE id = ?").run(payment.prev_paid_through, payment.bill_id);
    db.prepare("DELETE FROM weekly_payments WHERE id = ?").run(payment.id);
  })();
}

export function getWeeklyPaidTotal(month: string): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM weekly_payments WHERE month = ?")
    .get(month) as { total: number };
  return row.total;
}
