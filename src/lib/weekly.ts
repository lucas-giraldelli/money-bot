import { normalize } from "./fuzzy";
import { formatBRL } from "./format";

// Dates are handled as local "YYYY-MM-DD" strings, same as currentMonth()

export const DEFAULT_WEEKDAY = 5; // sexta

export const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "terça", "terca", "Terça-feira" → 2
export function parseWeekday(input: string): number | null {
  const n = normalize(input).replace(/-?feira$/, "");
  const idx = WEEKDAY_NAMES.findIndex((w) => normalize(w) === n);
  return idx === -1 ? null : idx;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(s: string, days: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function today(): string {
  return toISODate(new Date());
}

// Most recent <weekday> on or before the given date
export function lastWeekdayOnOrBefore(date: string, weekday: number): string {
  const back = (parseISODate(date).getDay() - weekday + 7) % 7;
  return addDays(date, -back);
}

// First <weekday> strictly after the given date
export function nextWeekdayAfter(date: string, weekday: number): string {
  const ahead = (weekday - parseISODate(date).getDay() + 7) % 7 || 7;
  return addDays(date, ahead);
}

// Every <weekday> in (after, until]
export function dueDatesBetween(after: string, until: string, weekday: number): string[] {
  const dates: string[] = [];
  for (let d = nextWeekdayAfter(after, weekday); d <= until; d = addDays(d, 7)) {
    dates.push(d);
  }
  return dates;
}

// Every <weekday> in the given "YYYY-MM" month
export function dueDatesInMonth(month: string, weekday: number): string[] {
  const [y, m] = month.split("-").map(Number);
  const lastDay = toISODate(new Date(y, m, 0));
  return dueDatesBetween(addDays(`${month}-01`, -1), lastDay, weekday);
}

// "2026-10-16" → "16/10"
export function formatDayMonth(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

// Position of a due date within its month: "2026-10-16" (sexta) → { index: 3, total: 5 }
export function weekOfMonth(date: string, weekday: number): { index: number; total: number } {
  const index = Math.ceil(Number(date.slice(8, 10)) / 7);
  const total = dueDatesInMonth(date.slice(0, 7), weekday).length;
  return { index, total };
}

function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

// Labels due dates by week of month:
//   ["2026-10-16"]                → "semana 3/5"
//   ["2026-10-16", "2026-10-23"]  → "semanas 3 e 4/5"
//   ["2026-10-30", "2026-11-06"]  → "5/5 out + 1/4 nov"
export function formatWeeks(dates: string[], weekday: number): string {
  const byMonth = new Map<string, string[]>();
  for (const d of dates) {
    const month = d.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), d]);
  }

  if (byMonth.size === 1) {
    const total = weekOfMonth(dates[0], weekday).total;
    const indexes = dates.map((d) => String(weekOfMonth(d, weekday).index));
    return `${dates.length === 1 ? "semana" : "semanas"} ${joinPt(indexes)}/${total}`;
  }

  return [...byMonth.entries()]
    .map(([month, ds]) => {
      const total = weekOfMonth(ds[0], weekday).total;
      const indexes = ds.map((d) => String(weekOfMonth(d, weekday).index));
      return `${joinPt(indexes)}/${total} ${MONTHS_SHORT[Number(month.slice(5, 7)) - 1]}`;
    })
    .join(" + ");
}

type WeeklySummary = {
  weekday: number;
  pending: string[];
  monthDues: string[];
  paidInMonth: number;
  nextDue: string;
};

// Line shown by !contas / !status:
//   "✅" "Nice — em dia (2/5) · próx. sexta 16/10"
//   "⏳" "Nice — R$ 500,00 · semana 3/5"
//   "⚠️" "Nice — R$ 1.000,00 · semanas 3 e 4/5"
export function describeWeekly(
  name: string,
  amount: number,
  s: WeeklySummary,
): { icon: string; text: string } {
  if (s.pending.length === 0) {
    return {
      icon: "✅",
      text: `${name} — em dia (${s.paidInMonth}/${s.monthDues.length}) · próx. ${WEEKDAY_NAMES[s.weekday]} ${formatDayMonth(s.nextDue)}`,
    };
  }
  return {
    icon: s.pending.length === 1 ? "⏳" : "⚠️",
    text: `${name} — ${formatBRL(amount * s.pending.length)} · ${formatWeeks(s.pending, s.weekday)}`,
  };
}
