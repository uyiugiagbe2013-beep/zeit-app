import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "zeitApp";

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

export default function App() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pause, setPause] = useState(0);

  // Load persisted state on mount (guard against invalid JSON).
  useEffect(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      if (typeof saved.start === "string") setStart(saved.start);
      if (typeof saved.end === "string") setEnd(saved.end);
      if (saved.pause !== undefined) setPause(clampNumber(saved.pause, { min: 0, max: 24 * 60 }));
    }
  }, []);

  // Persist state.
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ start, end, pause: clampNumber(pause, { min: 0, max: 24 * 60 }) })
    );
  }, [start, end, pause]);

  const pauseMinutes = useMemo(() => clampNumber(pause, { min: 0, max: 24 * 60 }), [pause]);

  const ist = useMemo(
    () => calcHours({ start, end, pauseMinutes }),
    [start, end, pauseMinutes]
  );

  const soll = 8;
  const ueber = ist - soll;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>⏱ Zeiterfassung</h1>

      <div style={styles.dashboard}>
        <Card title="Ist" value={`${ist.toFixed(2)}h`} />
        <Card title="Soll" value={`${soll}h`} />
        <Card title="Überstunden" value={`${ueber.toFixed(2)}h`} />
      </div>

      <div style={styles.card}>
        <label>Start</label>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />

        <label>Ende</label>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />

        <label>Pause (Min)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={pauseMinutes}
          onChange={(e) => setPause(e.target.value)}
        />

        <small style={styles.help}>
          Hinweis: Wenn die Endzeit vor der Startzeit liegt, wird eine Nachtschicht
          angenommen (Über-Mitternacht).
        </small>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={styles.stat}>
      <p style={styles.statTitle}>{title}</p>
      <h2 style={styles.statValue}>{value}</h2>
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
    background: "#1e293b",
    padding: 15,
    borderRadius: 12,
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
    background: "#1e293b",
    padding: 20,
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxWidth: 420,
  },
  help: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.4,
  },
};