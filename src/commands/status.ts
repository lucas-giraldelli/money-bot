import type { CommandContext } from "./types";
import { getPaymentsForMonth, ensureMonthPayments, getExpensesForMonth, getIncome } from "../db/index";
import { currentMonth, formatBRL, formatMonthLabel } from "../lib/format";

export async function status({ send }: CommandContext): Promise<void> {
  const month = currentMonth();
  ensureMonthPayments(month);

  const payments = getPaymentsForMonth(month);
  const expenses = getExpensesForMonth(month);
  const income = getIncome();

  const paid = payments.filter((p) => p.paid_at !== null);
  const pending = payments.filter((p) => p.paid_at === null);

  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = income - totalPaid - totalExpenses;

  const lines: string[] = [];
  lines.push(`💰 *${formatMonthLabel(month)}*`);
  lines.push("");

  if (paid.length > 0) {
    lines.push("✅ *Pagas*");
    for (const p of paid) {
      lines.push(`• ${p.name} — ${formatBRL(p.amount)}`);
    }
    lines.push("");
  }

  if (pending.length > 0) {
    lines.push("⏳ *Pendentes*");
    for (const p of pending) {
      lines.push(`• ${p.name} — ${formatBRL(p.amount)}`);
    }
    lines.push("");
  }

  if (expenses.length > 0) {
    lines.push(`🛒 *Gastos avulsos* — ${formatBRL(totalExpenses)}`);
    for (const e of expenses) {
      lines.push(`• ${e.description} — ${formatBRL(e.amount)}`);
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
