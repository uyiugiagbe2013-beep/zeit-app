/**
 * Time and date helpers for Zeiterfassung.
 * Week definition: Monday–Sunday (ISO, German standard).
 * Target working time: 8 h per weekday (Mon–Fri) → 40 h/week.
 */

export const DAILY_TARGET_H = 8;
export const WEEKLY_TARGET_H = 40; // 8 h × 5 workdays (Mon–Fri)

/** "YYYY-MM-DD" for a Date object */
export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today as "YYYY-MM-DD" */
export function todayStr() {
  return toDateStr(new Date());
}

/** Parse "YYYY-MM-DD" → Date (local midnight) */
export function parseDateStr(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Calculate worked hours from start "HH:mm", end "HH:mm", pauseMinutes.
 * Handles overnight shifts (end < start → add 24 h).
 */
export function calcHours({ start, end, pauseMinutes }) {
  if (!start || !end) return 0;
  const s = new Date(`1970-01-01T${start}:00`);
  const e = new Date(`1970-01-01T${end}:00`);
  let diff = (e - s) / (1000 * 60 * 60);
  if (diff < 0) diff += 24;
  diff -= (pauseMinutes || 0) / 60;
  return Math.max(0, diff);
}

/**
 * Get Monday of the week that contains the given date.
 * ISO week: Monday = 0 offset.
 */
export function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get all 7 days (Mon–Sun) of the week containing `date`.
 * Returns array of Date objects.
 */
export function getWeekDays(date) {
  const mon = getMondayOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

/** German short day names Mon–Sun */
export const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** German month names */
export const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/**
 * Get all calendar cells for a month grid (Mon–Sun columns).
 * Returns array of Date objects (may include days from prev/next month to fill grid).
 */
export function getMonthCells(year, month) {
  // month: 0-based
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Monday of the first week
  const start = getMondayOfWeek(firstDay);
  // End on Sunday of the last week
  const endMon = getMondayOfWeek(lastDay);
  const end = new Date(endMon);
  end.setDate(endMon.getDate() + 6);

  const cells = [];
  const cur = new Date(start);
  while (cur <= end) {
    cells.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

/** Format hours as "7h 30m" */
export function formatHours(h) {
  if (!h || h <= 0) return "0h";
  const totalMin = Math.round(h * 60);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
