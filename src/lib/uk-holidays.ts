// UK (England & Wales) bank holidays, computed offline — no network needed.
// Covers New Year, Good Friday, Easter Monday, Early May, Spring, Summer,
// Christmas Day, Boxing Day. Substitute days applied when a fixed date
// falls on a weekend, per gov.uk rules.

export type Holiday = { date: string; name: string }; // YYYY-MM-DD

// Meeus/Jones/Butcher — Gregorian Easter Sunday.
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Mar, 4 = Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

// First / last <weekday> of a given month (0 = Sun, 1 = Mon, ...).
function firstWeekday(year: number, month0: number, weekday: number) {
  const d = new Date(Date.UTC(year, month0, 1));
  const shift = (7 + weekday - d.getUTCDay()) % 7;
  return new Date(Date.UTC(year, month0, 1 + shift));
}
function lastWeekday(year: number, month0: number, weekday: number) {
  const last = new Date(Date.UTC(year, month0 + 1, 0));
  const shift = (7 + last.getUTCDay() - weekday) % 7;
  return new Date(Date.UTC(year, month0, last.getUTCDate() - shift));
}

// Substitute rule: if fixed date lands on Sat/Sun, move to next weekday.
function substitute(d: Date): Date {
  const day = d.getUTCDay();
  if (day === 6) return addDays(d, 2); // Sat -> Mon
  if (day === 0) return addDays(d, 1); // Sun -> Mon
  return d;
}

export function ukHolidaysForYear(year: number): Holiday[] {
  const easter = easterSunday(year);
  const list: Holiday[] = [
    { date: fmt(substitute(new Date(Date.UTC(year, 0, 1)))),  name: "New Year's Day" },
    { date: fmt(addDays(easter, -2)),                          name: "Good Friday" },
    { date: fmt(addDays(easter, 1)),                           name: "Easter Monday" },
    { date: fmt(firstWeekday(year, 4, 1)),                     name: "Early May bank holiday" },
    { date: fmt(lastWeekday(year, 4, 1)),                      name: "Spring bank holiday" },
    { date: fmt(lastWeekday(year, 7, 1)),                      name: "Summer bank holiday" },
    { date: fmt(substitute(new Date(Date.UTC(year, 11, 25)))), name: "Christmas Day" },
    { date: fmt(substitute(new Date(Date.UTC(year, 11, 26)))), name: "Boxing Day" },
  ];
  // Dedup / sort — substitute can push Christmas Day onto Boxing Day slot.
  const seen = new Map<string, string>();
  for (const h of list) if (!seen.has(h.date)) seen.set(h.date, h.name);
  return Array.from(seen, ([date, name]) => ({ date, name })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function holidayMapForYears(years: number[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const y of years) for (const h of ukHolidaysForYear(y)) m.set(h.date, h.name);
  return m;
}
