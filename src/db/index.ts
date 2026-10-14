export * from "./bills";
export * from "./payments";
export * from "./expenses";
export * from "./settings";
export * from "./weekly";

import { getSetting, setSetting } from "./settings";
import { incrementInstallments } from "./bills";
import { ensureMonthPayments } from "./payments";

// Called at command invocation time — handles month rollover lazily
export function checkMonthRollover(month: string): void {
  const last = getSetting("last_processed_month");
  if (last === month) return;
  // New month: increment installments then generate payments
  incrementInstallments();
  ensureMonthPayments(month);
  setSetting("last_processed_month", month);
}
