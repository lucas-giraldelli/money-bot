import type { CommandContext } from "./types";
import { getPaymentsForMonth, getExpensesForMonth, getWeeklyPaidTotal } from "../db/index";
import { currentMonth, formatBRL, formatMonthLabel } from "../lib/format";

export async function historico({ send }: CommandContext): Promise<void> {
  const now = currentMonth();
  const [year, mon] = now.split("-").map(Number);

  const months: string[] = [];
  for (let i = 1; i <= 3; i++) {
    let m = mon - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }

  const lines: string[] = [];
  lines.push("📅 *Histórico — últimos 3 meses*");

  for (const month of months) {
    const payments = getPaymentsForMonth(month);
    const expenses = getExpensesForMonth(month);

    const weeklyPaid = getWeeklyPaidTotal(month);
    if (payments.length === 0 && expenses.length === 0 && weeklyPaid === 0) continue;

    const totalPaid =
      payments.filter((p) => p.paid_at !== null).reduce((s, p) => s + p.amount, 0) + weeklyPaid;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    lines.push("");
    lines.push(`*${formatMonthLabel(month)}*`);
    lines.push(`  Contas pagas: ${formatBRL(totalPaid)}`);
    lines.push(`  Gastos avulsos: ${formatBRL(totalExpenses)}`);
    lines.push(`  Total: ${formatBRL(totalPaid + totalExpenses)}`);
  }

  if (lines.length === 1) {
    lines.push("\nNenhum dado encontrado nos últimos 3 meses.");
  }

  await send(lines.join("\n"));
}
