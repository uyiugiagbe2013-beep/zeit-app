import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "zeitApp";
const DEFAULT_SOLL = 8;
const MAX_PAUSE_MINUTES = 24 * 60;

const elevated = {
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  borderRadius: 20,
};

function safeParse(json) {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function clampNumber(value, { min = -Infinity, max = Infinity } = {}) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

function calcHours({ start, end, pauseMinutes }) {
  if (!start || !end) return 0;

  // Interpret times as HH:mm. Handle overnight shifts (end < start).
  const s = new Date(`1970-01-01T${start}:00`);
  const e = new Date(`1970-01-01T${end}:00`);

  let diff = (e - s) / (1000 * 60 * 60);
  if (diff < 0) diff += 24;

  diff -= pauseMinutes / 60;

  // Avoid negative worked time.
  return Math.max(0, diff);
}

function formatHours(h) {
  const sign = h < 0 ? "-" : h > 0 ? "+" : "";
  return `${sign}${Math.abs(h).toFixed(2)}h`;
}

export default function App() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pause, setPause] = useState(0);
  const [soll, setSoll] = useState(DEFAULT_SOLL);

  // Load persisted state on mount (guard against invalid JSON).
  useEffect(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      if (typeof saved.start === "string") setStart(saved.start);
      if (typeof saved.end === "string") setEnd(saved.end);
      if (saved.pause !== undefined) setPause(clampNumber(saved.pause, { min: 0, max: MAX_PAUSE_MINUTES }));
      if (saved.soll !== undefined) setSoll(clampNumber(saved.soll, { min: 0, max: 24 }));
    }
  }, []);

  // Persist state.
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        start,
        end,
        pause: clampNumber(pause, { min: 0, max: MAX_PAUSE_MINUTES }),
        soll: clampNumber(soll, { min: 0, max: 24 }),
      })
    );
  }, [start, end, pause, soll]);

  const pauseMinutes = useMemo(() => clampNumber(pause, { min: 0, max: MAX_PAUSE_MINUTES }), [pause]);
  const sollHours = useMemo(() => clampNumber(soll, { min: 0, max: 24 }), [soll]);

  const ist = useMemo(
    () => calcHours({ start, end, pauseMinutes }),
    [start, end, pauseMinutes]
  );

  const ueber = ist - sollHours;

  const handleReset = useCallback(() => {
    setStart("");
    setEnd("");
    setPause(0);
    setSoll(DEFAULT_SOLL);
  }, []);

  const ueberColor = ueber > 2 ? "#f87171" : ueber > 0 ? "#fbbf24" : ueber < 0 ? "#60a5fa" : "#4ade80";

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>⏱ Zeiterfassung</h1>

      <div style={styles.dashboard}>
        <Card title="Ist" value={`${ist.toFixed(2)}h`} />
        <Card title="Soll" value={`${sollHours}h`} />
        <Card title="Überstunden" value={formatHours(ueber)} valueColor={ueberColor} />
      </div>

      <div style={styles.card}>
        <div style={styles.fieldGroup}>
          <label htmlFor="input-start" style={styles.label}>Start</label>
          <input
            id="input-start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={styles.input}
            aria-label="Startzeit"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="input-end" style={styles.label}>Ende</label>
          <input
            id="input-end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={styles.input}
            aria-label="Endzeit"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="input-pause" style={styles.label}>Pause (Min)</label>
          <input
            id="input-pause"
            type="number"
            min={0}
            max={MAX_PAUSE_MINUTES}
            step={1}
            value={pauseMinutes}
            onChange={(e) => setPause(Number(e.target.value))}
            style={styles.input}
            aria-label="Pausendauer in Minuten"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="input-soll" style={styles.label}>Soll (Std)</label>
          <input
            id="input-soll"
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={sollHours}
            onChange={(e) => setSoll(Number(e.target.value))}
            style={styles.input}
            aria-label="Sollarbeitszeit in Stunden"
          />
        </div>

        <small style={styles.help}>
          Hinweis: Wenn die Endzeit vor der Startzeit liegt, wird eine Nachtschicht
          angenommen (Über-Mitternacht).
        </small>

        <button onClick={handleReset} style={styles.resetButton} aria-label="Eingaben zurücksetzen">
          Zurücksetzen
        </button>
      </div>
    </div>
  );
}

function Card({ title, value, valueColor }) {
  return (
    <div style={styles.stat}>
      <p style={styles.statTitle}>{title}</p>
      <h2 style={{ ...styles.statValue, ...(valueColor ? { color: valueColor } : {}) }}>{value}</h2>
    </div>
  );
}

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
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: "#cbd5e1",
  },
  input: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "white",
    padding: "6px 10px",
    fontSize: 15,
    outline: "none",
  },
  help: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.4,
  },
  resetButton: {
    marginTop: 4,
    padding: "8px 16px",
    background: "#334155",
    color: "#e2e8f0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    alignSelf: "flex-start",
  },
};