import { useState } from "react";

function parseMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

export default function App() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [projekt, setProjekt] = useState("");
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");

  const handleAdd = () => {
    const startMin = parseMinutes(start);
    const endMin = parseMinutes(end);

    if (startMin === null || endMin === null) {
      setError("Bitte gültige Zeiten im Format HH:MM eingeben.");
      return;
    }
    if (endMin <= startMin) {
      setError("Arbeitsende muss nach dem Arbeitsbeginn liegen.");
      return;
    }

    setEntries([
      ...entries,
      {
        id: Date.now(),
        start,
        end,
        projekt: projekt.trim() || "–",
        duration: endMin - startMin,
      },
    ]);
    setStart("");
    setEnd("");
    setProjekt("");
    setError("");
  };

  const handleDelete = (id) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div style={{ padding: 40, maxWidth: 600, fontFamily: "sans-serif" }}>
      <h1>⏱ Zeiterfassung App</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label htmlFor="start">Arbeitsbeginn</label>
          <input
            id="start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label htmlFor="end">Arbeitsende</label>
          <input
            id="end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 120 }}>
          <label htmlFor="projekt">Projekt / Beschreibung</label>
          <input
            id="projekt"
            type="text"
            placeholder="optional"
            value={projekt}
            onChange={(e) => setProjekt(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button onClick={handleAdd} style={{ padding: "4px 16px" }}>
            Hinzufügen
          </button>
        </div>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {entries.length > 0 && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ccc" }}>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Beginn</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Ende</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Dauer</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Projekt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "4px 8px" }}>{entry.start}</td>
                  <td style={{ padding: "4px 8px" }}>{entry.end}</td>
                  <td style={{ padding: "4px 8px" }}>{formatDuration(entry.duration)}</td>
                  <td style={{ padding: "4px 8px" }}>{entry.projekt}</td>
                  <td style={{ padding: "4px 8px" }}>
                    <button onClick={() => handleDelete(entry.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ marginTop: 8, fontWeight: "bold" }}>
            Gesamt: {formatDuration(totalMinutes)}
          </p>
        </>
      )}
    </div>
  );
}