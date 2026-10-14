import type { CommandContext } from "./types";
import {
  getPaymentsForMonth,
  ensureMonthPayments,
  getExpensesForMonth,
  getIncome,
  getActiveBills,
  getWeeklyStatus,
  getWeeklyPaidTotal,
} from "../db/index";
import { currentMonth, formatBRL, formatMonthLabel } from "../lib/format";
import { describeWeekly, today } from "../lib/weekly";

export async function status({ send }: CommandContext): Promise<void> {
  const month = currentMonth();
  ensureMonthPayments(month);

  const payments = getPaymentsForMonth(month);
  const expenses = getExpensesForMonth(month);
  const income = getIncome();

  const paid = payments.filter((p) => p.paid_at !== null);
  const pending = payments.filter((p) => p.paid_at === null);

  const paidLines = paid.map((p) => `• ${p.name} - ${formatBRL(p.amount)}`);
  const pendingLines = pending.map((p) => `• ${p.name} - ${formatBRL(p.amount)}`);

  const totalPaid = paid.reduce((s, p) => s + p.amount, 0) + getWeeklyPaidTotal(month);
  let totalPending = pending.reduce((s, p) => s + p.amount, 0);

  for (const bill of getActiveBills().filter((b) => b.frequency === "weekly")) {
    const status = getWeeklyStatus(bill, today(), month);
    const { text } = describeWeekly(bill.name, bill.amount, status);
    (status.pending.length === 0 ? paidLines : pendingLines).push(`• ${text}`);
    totalPending += bill.amount * (status.pending.length + status.upcoming.length);
  }
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = income - totalPaid - totalExpenses;

  const lines: string[] = [];
  lines.push(`💰 *${formatMonthLabel(month)}*`);
  lines.push("");

  if (paidLines.length > 0) {
    lines.push("✅ *Pagas*", ...paidLines, "");
  }

  if (pendingLines.length > 0) {
    lines.push("⏳ *Pendentes*", ...pendingLines, "");
  }

  if (expenses.length > 0) {
    lines.push(`🛒 *Gastos avulsos* - ${formatBRL(totalExpenses)}`);
    for (const e of expenses) {
      lines.push(`• ${e.description} - ${formatBRL(e.amount)}`);
    }
    lines.push("");
  }

  lines.push("📊 *Resumo*");
  if (income > 0) lines.push(`Renda: ${formatBRL(income)}`);
  lines.push(`Contas pagas: ${formatBRL(totalPaid)}`);
  lines.push(`Contas pendentes: ${formatBRL(totalPending)}`);
  lines.push(`Gastos avulsos: ${formatBRL(totalExpenses)}`);
  if (income > 0) lines.push(`Sobra estimada: ${formatBRL(balance)}`);

  await send(lines.join("\n"));
}
