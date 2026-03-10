import db from "./connection";

export type BillPayment = {
  id: number;
  bill_id: number;
  month: string;
  paid_at: string | null;
  paid_by: string | null;
};

export type BillPaymentWithName = BillPayment & {
  name: string;
  amount: number;
};

export function getPaymentsForMonth(month: string): BillPaymentWithName[] {
  return db
    .prepare(
      `SELECT bp.*, b.name, b.amount
       FROM bill_payments bp
       JOIN bills b ON b.id = bp.bill_id
       WHERE bp.month = ?
       ORDER BY b.id`,
    )
    .all(month) as BillPaymentWithName[];
}

export function ensureMonthPayments(month: string): void {
  const activeBills = db
    .prepare("SELECT id FROM bills WHERE active = 1")
    .all() as { id: number }[];

  const insert = db.prepare(
    "INSERT OR IGNORE INTO bill_payments (bill_id, month) VALUES (?, ?)",
  );
  // Use UNIQUE constraint workaround: check individually
  const checkStmt = db.prepare(
    "SELECT id FROM bill_payments WHERE bill_id = ? AND month = ?",
  );

  for (const bill of activeBills) {
    const existing = checkStmt.get(bill.id, month);
    if (!existing) {
      insert.run(bill.id, month);
    }
  }
}

export function markPaid(billId: number, month: string, paidBy: string): boolean {
  const row = db
    .prepare("SELECT id FROM bill_payments WHERE bill_id = ? AND month = ?")
    .get(billId, month) as { id: number } | undefined;
  if (!row) return false;

  db.prepare(
    "UPDATE bill_payments SET paid_at = datetime('now'), paid_by = ? WHERE id = ?",
  ).run(paidBy, row.id);
  return true;
}

export function unmarkPaid(billId: number, month: string): boolean {
  const row = db
    .prepare("SELECT id FROM bill_payments WHERE bill_id = ? AND month = ?")
    .get(billId, month) as { id: number } | undefined;
  if (!row) return false;

  db.prepare(
    "UPDATE bill_payments SET paid_at = NULL, paid_by = NULL WHERE id = ?",
  ).run(row.id);
  return true;
}

export function resetMonth(month: string): void {
  db.prepare(
    "UPDATE bill_payments SET paid_at = NULL, paid_by = NULL WHERE month = ?",
  ).run(month);
}
