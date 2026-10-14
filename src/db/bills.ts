import db from "./connection";

export type Bill = {
  id: number;
  name: string;
  amount: number;
  active: number;
  installment_current: number | null;
  installment_total: number | null;
  frequency: "monthly" | "weekly";
  weekday: number | null;
  paid_through: string | null;
};

export function getDisplayName(bill: Bill): string {
  if (bill.installment_current !== null && bill.installment_total !== null) {
    return `${bill.name} ${bill.installment_current}/${bill.installment_total}`;
  }
  return bill.name;
}

export function getActiveBills(): Bill[] {
  return db.prepare("SELECT * FROM bills WHERE active = 1 ORDER BY id").all() as Bill[];
}

export function getBillById(id: number): Bill | undefined {
  return db.prepare("SELECT * FROM bills WHERE id = ?").get(id) as Bill | undefined;
}

export function addBill(
  name: string,
  amount: number,
  installmentCurrent?: number,
  installmentTotal?: number,
): Bill {
  const info = db
    .prepare(
      "INSERT INTO bills (name, amount, active, installment_current, installment_total) VALUES (?, ?, 1, ?, ?)",
    )
    .run(name, amount, installmentCurrent ?? null, installmentTotal ?? null);
  return db.prepare("SELECT * FROM bills WHERE id = ?").get(info.lastInsertRowid) as Bill;
}

export function updateBillAmount(id: number, amount: number): void {
  db.prepare("UPDATE bills SET amount = ? WHERE id = ?").run(amount, id);
}

export function updateBillInstallment(id: number, current: number, total: number): void {
  db.prepare(
    "UPDATE bills SET installment_current = ?, installment_total = ? WHERE id = ?",
  ).run(current, total, id);
}

export function addWeeklyBill(name: string, amount: number, weekday: number, paidThrough: string): Bill {
  const info = db
    .prepare(
      "INSERT INTO bills (name, amount, active, frequency, weekday, paid_through) VALUES (?, ?, 1, 'weekly', ?, ?)",
    )
    .run(name, amount, weekday, paidThrough);
  return db.prepare("SELECT * FROM bills WHERE id = ?").get(info.lastInsertRowid) as Bill;
}

// Deactivates a bill but keeps its paid history (bill_payments reads amount from the bill)
export function retireBill(id: number): void {
  db.prepare("UPDATE bills SET active = 0 WHERE id = ?").run(id);
  db.prepare("DELETE FROM bill_payments WHERE bill_id = ? AND paid_at IS NULL").run(id);
}

export function updateBillWeekday(id: number, weekday: number): void {
  db.prepare("UPDATE bills SET weekday = ? WHERE id = ?").run(weekday, id);
}

export function deleteBill(id: number): void {
  db.prepare("DELETE FROM bill_payments WHERE bill_id = ?").run(id);
  db.prepare("DELETE FROM weekly_payments WHERE bill_id = ?").run(id);
  db.prepare("DELETE FROM bills WHERE id = ?").run(id);
}

export function incrementInstallments(): void {
  // Increment current installment for all active installment bills
  db.prepare(`
    UPDATE bills
    SET installment_current = installment_current + 1
    WHERE active = 1 AND installment_current IS NOT NULL
  `).run();

  // Deactivate bills that exceeded their total
  db.prepare(`
    UPDATE bills
    SET active = 0
    WHERE installment_current > installment_total AND installment_total IS NOT NULL
  `).run();
}
