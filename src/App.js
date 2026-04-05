import { useEffect, useMemo, useState } from "react";

// localStorage key for the current form values (start/end/pause)
const STORAGE_KEY = "zeitApp";
// localStorage key for saved daily entries
const ENTRIES_KEY = "zeitAppEntries";

// Shared elevated card style used by stat cards and the input card.
const elevated = {
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  borderRadius: 20,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Never throw on bad JSON. */
function safeParse(json) {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/** Coerce value to a finite number and clamp it. */
function clampNumber(value, { min = -Infinity, max = Infinity } = {}) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

/** Compute worked hours from start/end (HH:mm) and pause in minutes.
 *  Overnight shifts (end < start) are supported – up to 24 h span.
 */
function calcHours({ start, end, pauseMinutes }) {
  if (!start || !end) return 0;
  const s = new Date(`1970-01-01T${start}:00`);
  const e = new Date(`1970-01-01T${end}:00`);
  let diff = (e - s) / (1000 * 60 * 60);
  if (diff < 0) diff += 24; // overnight shift
  diff -= pauseMinutes / 60;
  return Math.max(0, diff); // never negative
}

/** Today as YYYY-MM-DD in local time. */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the ISO week that contains dateStr (YYYY-MM-DD). */
function getWeekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay(); // 0=Sun … 6=Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Array of 7 date strings (Mon–Sun) for the week containing dateStr. */
function getWeekDates(dateStr) {
  const monday = new Date(getWeekStart(dateStr) + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${day}`;
  });
}

/** Stable unique id that does not require any external library. */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // Current input form state
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pause, setPause] = useState(0);
  const [date, setDate] = useState(todayStr);
  const [note, setNote] = useState("");

  // Saved entries list
  const [entries, setEntries] = useState([]);

  // ── Load persisted data on mount ──────────────────────────────────────────
  useEffect(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      if (typeof saved.start === "string") setStart(saved.start);
      if (typeof saved.end === "string") setEnd(saved.end);
      if (saved.pause !== undefined)
        setPause(clampNumber(saved.pause, { min: 0, max: 24 * 60 }));
    }

    const savedEntries = safeParse(localStorage.getItem(ENTRIES_KEY));
    if (Array.isArray(savedEntries)) setEntries(savedEntries);
  }, []);

  // ── Persist form state ────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ start, end, pause: clampNumber(pause, { min: 0, max: 24 * 60 }) })
    );
  }, [start, end, pause]);

  // ── Persist entries ───────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  }, [entries]);

  // ── Derived values ────────────────────────────────────────────────────────
  const pauseMinutes = useMemo(
    () => clampNumber(pause, { min: 0, max: 24 * 60 }),
    [pause]
  );

  const ist = useMemo(
    () => calcHours({ start, end, pauseMinutes }),
    [start, end, pauseMinutes]
  );

  const soll = 8;
  const ueber = ist - soll;

  // ── Weekly totals (Mon–Sun of the current week) ───────────────────────────
  // Target: 8 h × number of distinct weekdays that have at least one entry.
  // This grows proportionally to the days actually worked this week.
  const weekDates = useMemo(() => getWeekDates(todayStr()), []);

  const weeklyData = useMemo(() => {
    const weekEntries = entries.filter((e) => weekDates.includes(e.date));
    const daysWithEntries = new Set(weekEntries.map((e) => e.date)).size;
    const totalHours = weekEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const target = daysWithEntries * 8;
    const weeklyOvertime = totalHours - target;
    return { totalHours, target, weeklyOvertime, daysWithEntries };
  }, [entries, weekDates]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function saveEntry() {
    if (!start || !end) return;
    const hoursWorked = calcHours({ start, end, pauseMinutes });
    const entry = {
      id: genId(),
      date: date || todayStr(),
      start,
      end,
      pauseMinutes,
      hoursWorked,
      note: note.trim(),
    };
    setEntries((prev) => [entry, ...prev]);
    setNote(""); // reset note field after saving
  }

  function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function editNote(id) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    // eslint-disable-next-line no-alert
    const newNote = window.prompt("Notiz bearbeiten:", entry.note || "");
    if (newNote !== null) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, note: newNote.trim() } : e))
      );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>⏱ Zeiterfassung</h1>

      {/* Today's live dashboard */}
      <div style={styles.dashboard}>
        <Card title="Ist" value={`${ist.toFixed(2)}h`} />
        <Card title="Soll" value={`${soll}h`} />
        <Card title="Überstunden" value={`${ueber.toFixed(2)}h`} />
      </div>

      {/* Input form */}
      <div style={styles.card}>
        <label style={styles.label}>Datum</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Start</label>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Ende</label>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Pause (Min)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={pauseMinutes}
          onChange={(e) => setPause(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Notiz (optional)</label>
        <input
          type="text"
          value={note}
          placeholder="z.B. Homeoffice"
          onChange={(e) => setNote(e.target.value)}
          style={styles.input}
        />

        <small style={styles.help}>
          Hinweis: Wenn die Endzeit vor der Startzeit liegt, wird eine
          Nachtschicht angenommen (Über-Mitternacht).
        </small>

        <button
          onClick={saveEntry}
          disabled={!start || !end}
          style={!start || !end ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
        >
          Eintrag speichern
        </button>
      </div>

      {/* Weekly totals */}
      <h2 style={styles.sectionTitle}>📅 Diese Woche</h2>
      <div style={styles.dashboard}>
        <Card title="Gesamt" value={`${weeklyData.totalHours.toFixed(2)}h`} />
        <Card title="Ziel" value={`${weeklyData.target}h`} />
        <Card
          title="Wochenüberstunden"
          value={`${weeklyData.weeklyOvertime.toFixed(2)}h`}
        />
        <Card title="Tage" value={`${weeklyData.daysWithEntries}`} />
      </div>

      {/* History */}
      <h2 style={styles.sectionTitle}>🗂 Verlauf</h2>
      {entries.length === 0 ? (
        <p style={styles.emptyText}>Noch keine Einträge gespeichert.</p>
      ) : (
        <div style={styles.entryList}>
          {entries.map((entry) => (
            <div key={entry.id} style={styles.entryRow}>
              <div style={styles.entryInfo}>
                <strong>{entry.date}</strong>
                <span>
                  {" "}
                  {entry.start} – {entry.end}
                </span>
                <span style={styles.entryMeta}>
                  {" "}
                  | Pause: {entry.pauseMinutes} Min
                </span>
                <span> | {entry.hoursWorked.toFixed(2)}h</span>
                {entry.note ? (
                  <em style={styles.entryMeta}> | {entry.note}</em>
                ) : null}
              </div>
              <div style={styles.entryActions}>
                <button
                  onClick={() => editNote(entry.id)}
                  style={styles.btnSmall}
                  title="Notiz bearbeiten"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  style={styles.btnSmallDanger}
                  title="Eintrag löschen"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reusable stat card ────────────────────────────────────────────────────────

function Card({ title, value }) {
  return (
    <div style={styles.stat}>
      <p style={styles.statTitle}>{title}</p>
      <h2 style={styles.statValue}>{value}</h2>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "white",
    padding: 20,
    fontFamily: "sans-serif",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    margin: "24px 0 12px",
    color: "#e2e8f0",
  },
  dashboard: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  stat: {
    ...elevated,
    background: "#1e293b",
    padding: 15,
    flex: "1 1 140px",
    textAlign: "center",
  },
  statTitle: {
    color: "#94a3b8",
    fontSize: 12,
    margin: 0,
  },
  statValue: {
    margin: "6px 0 0",
  },
  card: {
    ...elevated,
    background: "#1e293b",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxWidth: 420,
  },
  label: {
    fontSize: 13,
    color: "#cbd5e1",
    marginBottom: -4,
  },
  input: {
    background: "#0f172a",
    color: "white",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  help: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.4,
  },
  button: {
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    cursor: "pointer",
    marginTop: 4,
  },
  buttonDisabled: {
    background: "#1e3a5f",
    cursor: "not-allowed",
    opacity: 0.6,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  entryList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxWidth: 640,
  },
  entryRow: {
    ...elevated,
    background: "#1e293b",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  entryInfo: {
    fontSize: 14,
    lineHeight: 1.6,
  },
  entryMeta: {
    color: "#94a3b8",
  },
  entryActions: {
    display: "flex",
    gap: 6,
  },
  btnSmall: {
    background: "#334155",
    border: "none",
    borderRadius: 8,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 14,
  },
  btnSmallDanger: {
    background: "#7f1d1d",
    border: "none",
    borderRadius: 8,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 14,
  },
};