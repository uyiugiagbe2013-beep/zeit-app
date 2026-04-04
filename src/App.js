import { useState, useEffect } from "react";

export default function App() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pause, setPause] = useState(0);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("zeitApp"));
    if (saved) {
      setStart(saved.start);
      setEnd(saved.end);
      setPause(saved.pause);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "zeitApp",
      JSON.stringify({ start, end, pause })
    );
  }, [start, end, pause]);

  const calcHours = () => {
    if (!start || !end) return 0;

    const s = new Date(`1970-01-01T${start}`);
    const e = new Date(`1970-01-01T${end}`);

    let diff = (e - s) / (1000 * 60 * 60);
    diff -= pause / 60;

    return diff;
  };

  const ist = calcHours();
  const soll = 8;
  const ueber = ist - soll;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>⏱ Zeiterfassung</h1>

      <div style={styles.dashboard}>
        <Card title="Ist-Stunden" value={`${ist.toFixed(2)} h`} />
        <Card title="Soll-Stunden" value={`${soll} h`} />
        <Card title="Überstunden" value={`${ueber.toFixed(2)} h`} />
      </div>

      <div style={styles.card}>
        <label style={styles.label}>Arbeitsbeginn</label>
        <input
          style={styles.input}
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />

        <label style={styles.label}>Arbeitsende</label>
        <input
          style={styles.input}
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />

        <label style={styles.label}>Pause (Minuten)</label>
        <input
          style={styles.input}
          type="number"
          min="0"
          value={pause}
          onChange={(e) => setPause(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statTitle}>{title}</div>
      <div>{value}</div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "white",
    padding: 20,
    fontFamily: "sans-serif"
  },
  title: {
    fontSize: 24,
    marginBottom: 20
  },
  dashboard: {
    display: "flex",
    gap: 10,
    marginBottom: 20
  },
  stat: {
    background: "#1e293b",
    padding: 15,
    borderRadius: 12,
    flex: 1,
    textAlign: "center"
  },
  statTitle: {
    color: "#94a3b8",
    fontSize: 12
  },
  card: {
    background: "#1e293b",
    padding: 20,
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  input: {
    background: "#0f172a",
    border: "1px solid #475569",
    color: "white",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit"
  },
  label: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 500,
    marginTop: 10
  }
};