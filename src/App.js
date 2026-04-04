import { useState } from "react";

export default function App() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pause, setPause] = useState(0);

  const calculate = () => {
    if (!start || !end) return "";

    const s = new Date(`1970-01-01T${start}`);
    const e = new Date(`1970-01-01T${end}`);

    let diff = (e - s) / (1000 * 60 * 60);
    diff -= pause / 60;

    return diff.toFixed(2) + " Stunden";
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>⏱ Zeiterfassung App</h1>

      <div style={{ marginBottom: 16 }}>
        <label>
          Arbeitsbeginn:{" "}
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>
          Arbeitsende:{" "}
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>
          Pause (Minuten):{" "}
          <input
            type="number"
            min="0"
            value={pause}
            onChange={(e) => setPause(Number(e.target.value))}
          />
        </label>
      </div>

      {calculate() && (
        <p>
          <strong>Arbeitszeit: {calculate()}</strong>
        </p>
      )}
    </div>
  );
}