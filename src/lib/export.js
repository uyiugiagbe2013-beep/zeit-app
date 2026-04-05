/**
 * Export helpers: CSV download and print.
 */

import { calcHours } from "./time";

/**
 * Build CSV string from entries.
 * Columns: date,start,end,pauseMinutes,hoursWorked,note
 */
function buildCSV(entries) {
  const header = "date,start,end,pauseMinutes,hoursWorked,note";
  const rows = entries.map((e) => {
    const h = calcHours({
      start: e.start,
      end: e.end,
      pauseMinutes: Number(e.pauseMinutes) || 0,
    });
    const note = (e.note || "").replace(/"/g, '""').replace(/\r?\n/g, " ");
    return `${e.date},${e.start},${e.end},${e.pauseMinutes || 0},${h.toFixed(2)},"${note}"`;
  });
  return [header, ...rows].join("\r\n");
}

/**
 * Trigger a CSV file download in the browser.
 * @param {Array} entries - array of entry objects
 * @param {string} filename - desired filename
 */
export function downloadCSV(entries, filename = "zeiterfassung.csv") {
  const csv = buildCSV(entries);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Open the browser print dialog. */
export function printPage() {
  window.print();
}
