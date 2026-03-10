import db from "./connection";

export type Expense = {
  id: number;
  description: string;
  amount: number;
  month: string;
  added_by: string | null;
  created_at: string;
};

export function getExpensesForMonth(month: string): Expense[] {
  return db
    .prepare("SELECT * FROM expenses WHERE month = ? ORDER BY created_at")
    .all(month) as Expense[];
}

export function addExpense(
  description: string,
  amount: number,
  month: string,
  addedBy: string,
): Expense {
  const info = db
    .prepare(
      "INSERT INTO expenses (description, amount, month, added_by) VALUES (?, ?, ?, ?)",
    )
    .run(description, amount, month, addedBy);
  return db
    .prepare("SELECT * FROM expenses WHERE id = ?")
    .get(info.lastInsertRowid) as Expense;
}

export function getTotalExpenses(month: string): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE month = ?")
    .get(month) as { total: number };
  return row.total;
}

export function getExpensesLastMonths(
  currentMonth: string,
  count: number,
): Array<{ month: string; expenses: Expense[] }> {
  const [year, mon] = currentMonth.split("-").map(Number);
  const result: Array<{ month: string; expenses: Expense[] }> = [];

  for (let i = 0; i < count; i++) {
    let m = mon - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const monthStr = `${y}-${String(m).padStart(2, "0")}`;
    result.push({
      month: monthStr,
      expenses: getExpensesForMonth(monthStr),
    });
  }

  return result;
}
