/**
 * Hardened localStorage helpers.
 */

const ENTRIES_KEY = "zeitApp_entries";

function safeParse(json) {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/** Load entries array from localStorage; returns [] on any error. */
export function loadEntries() {
  const raw = localStorage.getItem(ENTRIES_KEY);
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  // Validate each entry shape
  return parsed.filter(
    (e) =>
      e &&
      typeof e === "object" &&
      typeof e.id === "string" &&
      typeof e.date === "string" &&
      typeof e.start === "string" &&
      typeof e.end === "string"
  );
}

/** Save entries array to localStorage. */
export function saveEntries(entries) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}
