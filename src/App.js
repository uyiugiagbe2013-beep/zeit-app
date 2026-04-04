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

      {/* DASHBOARD */}
      <div style={styles.dashboard}>
        <Card title="Ist" value={ist.toFixed(2) + "h"} />
        <Card title="Soll" value={soll + "h"} />
        <Card title="Überstunden" value={ueber.toFixed(2) + "h"} />
      </div>

      {/* INPUTS */}
      <div style={styles.card}>
        <label>Start</label>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />

        <label>Ende</label>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />

        <label>Pause (Min)</label>
        <input type="number" value={pause} onChange={(e) => setPause(e.target.value)} />
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={styles.stat}>
      <p style={styles.statTitle}>{title}</p>
      <h2>{value}</h2>
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
  }
};// Full Time Tracking Implementation

const timeEntries = JSON.parse(localStorage.getItem('timeEntries')) || [];

// Function to add a time entry
function addTimeEntry(description, hours) {
    const entry = { description, hours, date: new Date().toISOString() };
    timeEntries.push(entry);
    localStorage.setItem('timeEntries', JSON.stringify(timeEntries));
}

// Function to calculate total hours
function calculateTotalHours() {
    return timeEntries.reduce((total, entry) => total + entry.hours, 0);
}

// Function to display time entries
function displayTimeEntries() {
    const entriesContainer = document.getElementById('entries');
    entriesContainer.innerHTML = '';
    timeEntries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.innerText = `${entry.date}: ${entry.description} - ${entry.hours} hours`;
        entriesContainer.appendChild(entryElement);
    });
}

// Event listener for adding an entry
document.getElementById('add-entry-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const description = event.target.description.value;
    const hours = parseFloat(event.target.hours.value);
    addTimeEntry(description, hours);
    displayTimeEntries();
    console.log(`Total hours: ${calculateTotalHours()}`);
});

displayTimeEntries();
