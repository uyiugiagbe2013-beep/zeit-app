import { useCallback, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import {
  calcHours, toDateStr, todayStr, parseDateStr,
  getWeekDays, getMonthCells,
  DAY_NAMES, MONTH_NAMES,
  DAILY_TARGET_H, WEEKLY_TARGET_H,
  formatHours,
} from "./lib/time";
import { loadEntries, saveEntries } from "./lib/storage";
import { downloadCSV, printPage } from "./lib/export";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampNumber(value, { min = -Infinity, max = Infinity } = {}) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  // --- Form state ---
  const [formDate, setFormDate] = useState(todayStr());
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formPause, setFormPause] = useState(0);
  const [formNote, setFormNote] = useState("");

  // --- Entries (persisted) ---
  const [entries, setEntries] = useState(() => loadEntries());

  // --- Selected date (calendar / weekly view) ---
  const [selectedDate, setSelectedDate] = useState(todayStr());

  // --- Calendar month displayed ---
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-based

  // --- CSV export scope ---
  const [exportScope, setExportScope] = useState("week"); // "week" | "all"

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const pauseMinutes = useMemo(
    () => clampNumber(formPause, { min: 0, max: 24 * 60 }),
    [formPause]
  );

  const formIst = useMemo(
    () => calcHours({ start: formStart, end: formEnd, pauseMinutes }),
    [formStart, formEnd, pauseMinutes]
  );

  // Entries indexed by date for quick lookup
  const entriesByDate = useMemo(() => {
    const map = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [entries]);

  // Hours per date
  const hoursByDate = useMemo(() => {
    const map = {};
    for (const [date, list] of Object.entries(entriesByDate)) {
      map[date] = list.reduce(
        (sum, e) =>
          sum +
          calcHours({
            start: e.start,
            end: e.end,
            pauseMinutes: Number(e.pauseMinutes) || 0,
          }),
        0
      );
    }
    return map;
  }, [entriesByDate]);

  // Week days for selected date (Mon–Sun)
  const weekDays = useMemo(() => getWeekDays(parseDateStr(selectedDate)), [selectedDate]);

  // Per-day data for charts & weekly summary
  const weekData = useMemo(() => {
    let cumulative = 0;
    return weekDays.map((d, i) => {
      const ds = toDateStr(d);
      const h = hoursByDate[ds] || 0;
      cumulative += h;
      return {
        day: DAY_NAMES[i],
        date: ds,
        hours: parseFloat(h.toFixed(2)),
        cumulative: parseFloat(cumulative.toFixed(2)),
      };
    });
  }, [weekDays, hoursByDate]);

  const weekTotal = useMemo(
    () => weekData.reduce((s, d) => s + d.hours, 0),
    [weekData]
  );

  const weekOvertime = weekTotal - WEEKLY_TARGET_H;

  // Entries for selected week (for export)
  const weekEntries = useMemo(() => {
    const weekDateSet = new Set(weekDays.map((d) => toDateStr(d)));
    return entries.filter((e) => weekDateSet.has(e.date));
  }, [entries, weekDays]);

  // Calendar cells
  const calCells = useMemo(
    () => getMonthCells(calYear, calMonth),
    [calYear, calMonth]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const saveEntry = useCallback(() => {
    if (!formDate || !formStart || !formEnd) return;
    const entry = {
      id: newId(),
      date: formDate,
      start: formStart,
      end: formEnd,
      pauseMinutes: clampNumber(formPause, { min: 0, max: 24 * 60 }),
      note: formNote.trim(),
    };
    const updated = [entry, ...entries].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    setEntries(updated);
    saveEntries(updated);
    // Reset form but keep date
    setFormStart("");
    setFormEnd("");
    setFormPause(0);
    setFormNote("");
    // Select the saved date
    setSelectedDate(formDate);
  }, [formDate, formStart, formEnd, formPause, formNote, entries]);

  const deleteEntry = useCallback(
    (id) => {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      saveEntries(updated);
    },
    [entries]
  );

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };
  const goToday = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedDate(todayStr());
  };

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setFormDate(dateStr);
    document.getElementById("verlauf")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleExportCSV = () => {
    const toExport = exportScope === "week" ? weekEntries : entries;
    const fname =
      exportScope === "week"
        ? `zeiterfassung_woche_${toDateStr(weekDays[0])}.csv`
        : "zeiterfassung_alle.csv";
    downloadCSV(toExport, fname);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const todayISO = todayStr();

  return (
    <div style={s.container}>
      {/* Header */}
      <h1 style={s.title}>⏱ Zeiterfassung</h1>

      {/* Entry form */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Eintrag erfassen</h2>
        <div style={s.card}>
          <div style={s.formRow}>
            <div style={s.formField}>
              <label style={s.label}>Datum</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={s.input}
              />
            </div>
            <div style={s.formField}>
              <label style={s.label}>Start</label>
              <input
                type="time"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                style={s.input}
              />
            </div>
            <div style={s.formField}>
              <label style={s.label}>Ende</label>
              <input
                type="time"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                style={s.input}
              />
            </div>
            <div style={s.formField}>
              <label style={s.label}>Pause (Min)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={pauseMinutes}
                onChange={(e) => setFormPause(e.target.value)}
                style={s.input}
              />
            </div>
          </div>
          <div style={s.formField}>
            <label style={s.label}>Notiz</label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Optionale Notiz…"
              style={s.input}
            />
          </div>

          {formStart && formEnd && (
            <div style={s.preview}>
              Vorschau: <strong>{formIst.toFixed(2)} h</strong> gearbeitet
              {formIst < DAILY_TARGET_H
                ? ` (${(DAILY_TARGET_H - formIst).toFixed(2)} h unter Soll)`
                : ` (+${(formIst - DAILY_TARGET_H).toFixed(2)} h Überstunden)`}
              {formEnd < formStart && (
                <span style={{ color: "#fbbf24", marginLeft: 8 }}>
                  ⚠ Nachtschicht angenommen
                </span>
              )}
            </div>
          )}

          <button
            onClick={saveEntry}
            disabled={!formDate || !formStart || !formEnd}
            style={!formDate || !formStart || !formEnd ? s.btnDisabled : s.btn}
          >
            💾 Eintrag speichern
          </button>
        </div>
      </section>

      {/* Kalender */}
      <section style={s.section} className="print-hidden">
        <h2 style={s.sectionTitle}>Kalender</h2>
        <div style={s.card}>
          <div style={s.calNav}>
            <button onClick={prevMonth} style={s.navBtn}>‹</button>
            <span style={s.calMonthLabel}>
              {MONTH_NAMES[calMonth]} {calYear}
            </span>
            <button onClick={nextMonth} style={s.navBtn}>›</button>
            <button onClick={goToday} style={{ ...s.navBtn, marginLeft: 8, fontSize: 12 }}>
              Heute
            </button>
          </div>
          <div style={s.calGrid}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={s.calHeader}>{d}</div>
            ))}
            {calCells.map((d) => {
              const ds = toDateStr(d);
              const isCurrentMonth = d.getMonth() === calMonth;
              const isToday = ds === todayISO;
              const isSelected = ds === selectedDate;
              const dayHours = hoursByDate[ds];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={ds}
                  onClick={() => handleDayClick(ds)}
                  style={{
                    ...s.calCell,
                    opacity: isCurrentMonth ? 1 : 0.3,
                    background: isSelected
                      ? "#3b82f6"
                      : isToday
                      ? "#1e40af"
                      : isWeekend
                      ? "#1a2540"
                      : "#1e293b",
                    cursor: "pointer",
                  }}
                >
                  <span style={s.calDay}>{d.getDate()}</span>
                  {dayHours !== undefined && (
                    <span style={s.calHours}>{formatHours(dayHours)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wochen-Auswertung */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>
          Wochen-Auswertung{" "}
          <span style={s.sectionSub}>
            ({toDateStr(weekDays[0])} – {toDateStr(weekDays[6])})
          </span>
        </h2>
        <p style={s.targetNote}>
          Ziel: 8 h/Tag × 5 Werktage (Mo–Fr) = 40 h/Woche
        </p>
        <div style={s.card}>
          <div style={s.weekGrid}>
            {weekData.map((d) => {
              const isSel = d.date === selectedDate;
              const isWeekend = ["Sa", "So"].includes(d.day);
              return (
                <div
                  key={d.day}
                  onClick={() => handleDayClick(d.date)}
                  style={{
                    ...s.weekCell,
                    background: isSel ? "#3b82f6" : "#253047",
                    cursor: "pointer",
                    opacity: isWeekend ? 0.7 : 1,
                  }}
                >
                  <span style={s.weekDayName}>{d.day}</span>
                  <span style={s.weekDayHours}>
                    {d.hours > 0 ? formatHours(d.hours) : "–"}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={s.weekTotals}>
            <div style={s.totalItem}>
              <span style={s.totalLabel}>Gesamt</span>
              <span style={s.totalValue}>{formatHours(weekTotal)}</span>
            </div>
            <div style={s.totalItem}>
              <span style={s.totalLabel}>Ziel</span>
              <span style={s.totalValue}>{WEEKLY_TARGET_H} h</span>
            </div>
            <div style={s.totalItem}>
              <span style={s.totalLabel}>
                {weekOvertime >= 0 ? "Überstunden" : "Fehlstunden"}
              </span>
              <span
                style={{
                  ...s.totalValue,
                  color: weekOvertime >= 0 ? "#4ade80" : "#f87171",
                }}
              >
                {weekOvertime >= 0 ? "+" : ""}
                {formatHours(Math.abs(weekOvertime))}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Charts */}
      <section style={s.section} className="print-hidden">
        <h2 style={s.sectionTitle}>Charts</h2>
        <div style={{ ...s.card, gap: 24 }}>
          <div>
            <p style={s.chartTitle}>Stunden pro Tag</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  formatter={(v) => [`${v} h`, "Stunden"]}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Stunden" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p style={s.chartTitle}>Kumulierte Stunden (Mo–So)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weekData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
                  formatter={(v) => [`${v} h`, "Kumuliert"]}
                />
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Kumuliert"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Export */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Export</h2>
        <div style={s.card}>
          <div style={s.exportRow}>
            <label style={s.label}>Bereich:</label>
            <select
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value)}
              style={s.select}
            >
              <option value="week">Aktuelle Woche</option>
              <option value="all">Alle Einträge</option>
            </select>
          </div>
          <div style={s.exportRow}>
            <button onClick={handleExportCSV} style={s.btn}>
              📥 CSV exportieren
            </button>
            <button onClick={printPage} style={{ ...s.btn, background: "#475569" }}>
              🖨 Drucken / PDF
            </button>
          </div>
          <small style={s.help}>
            "Drucken / PDF" öffnet den Browser-Druckdialog. Wähle dort "Als PDF speichern".
          </small>
        </div>
      </section>

      {/* Verlauf */}
      <section style={s.section} id="verlauf">
        <h2 style={s.sectionTitle}>
          Verlauf{" "}
          <span style={s.sectionSub}>({entries.length} Einträge)</span>
        </h2>
        {entries.length === 0 ? (
          <p style={s.empty}>Noch keine Einträge vorhanden.</p>
        ) : (
          <div style={s.entryList}>
            {entries.map((e) => {
              const h = calcHours({
                start: e.start,
                end: e.end,
                pauseMinutes: Number(e.pauseMinutes) || 0,
              });
              const isSelected = e.date === selectedDate;
              return (
                <div
                  key={e.id}
                  style={{
                    ...s.entryCard,
                    borderLeft: isSelected
                      ? "3px solid #3b82f6"
                      : "3px solid transparent",
                  }}
                >
                  <div style={s.entryRow}>
                    <span style={s.entryDate}>{e.date}</span>
                    <span style={s.entryTime}>
                      {e.start} – {e.end}
                    </span>
                    {e.pauseMinutes > 0 && (
                      <span style={s.entryPause}>Pause: {e.pauseMinutes} Min</span>
                    )}
                    <span style={s.entryHours}>{formatHours(h)}</span>
                    {e.note && <span style={s.entryNote}>{e.note}</span>}
                    <button
                      onClick={() => deleteEntry(e.id)}
                      style={s.deleteBtn}
                      title="Löschen"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Print-only summary (hidden on screen) */}
      <div className="print-only">
        <h2>Wochen-Auswertung {toDateStr(weekDays[0])} – {toDateStr(weekDays[6])}</h2>
        <p>Ziel: {WEEKLY_TARGET_H} h | Gearbeitet: {weekTotal.toFixed(2)} h | Überstunden: {weekOvertime.toFixed(2)} h</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "4px 8px" }}>Tag</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "4px 8px" }}>Datum</th>
              <th style={{ textAlign: "right", borderBottom: "1px solid #ccc", padding: "4px 8px" }}>Stunden</th>
            </tr>
          </thead>
          <tbody>
            {weekData.map((d) => (
              <tr key={d.day}>
                <td style={{ padding: "4px 8px" }}>{d.day}</td>
                <td style={{ padding: "4px 8px" }}>{d.date}</td>
                <td style={{ textAlign: "right", padding: "4px 8px" }}>{d.hours > 0 ? `${d.hours} h` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const elevated = {
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  borderRadius: 16,
};

const s = {
  container: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "white",
    padding: "20px 16px 60px",
    fontFamily: "system-ui, sans-serif",
    maxWidth: 860,
    margin: "0 auto",
  },
  title: {
    fontSize: 26,
    marginBottom: 24,
    fontWeight: 700,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
    color: "#e2e8f0",
  },
  sectionSub: {
    fontSize: 13,
    fontWeight: 400,
    color: "#64748b",
  },
  targetNote: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
    fontStyle: "italic",
  },
  card: {
    ...elevated,
    background: "#1e293b",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  formRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: "1 1 120px",
  },
  label: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: 500,
  },
  input: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "white",
    padding: "8px 10px",
    fontSize: 14,
    outline: "none",
  },
  select: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "white",
    padding: "8px 10px",
    fontSize: 14,
  },
  preview: {
    fontSize: 13,
    color: "#94a3b8",
    padding: "8px 12px",
    background: "#0f172a",
    borderRadius: 8,
  },
  btn: {
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 600,
    alignSelf: "flex-start",
  },
  btnDisabled: {
    background: "#334155",
    color: "#64748b",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    cursor: "not-allowed",
    fontWeight: 600,
    alignSelf: "flex-start",
  },
  calNav: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  calMonthLabel: {
    fontSize: 16,
    fontWeight: 600,
    flex: 1,
    textAlign: "center",
  },
  navBtn: {
    background: "#334155",
    color: "white",
    border: "none",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 16,
    cursor: "pointer",
  },
  calGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 4,
  },
  calHeader: {
    textAlign: "center",
    fontSize: 11,
    color: "#64748b",
    fontWeight: 600,
    padding: "4px 0",
  },
  calCell: {
    borderRadius: 8,
    padding: "6px 4px",
    minHeight: 52,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 2,
    transition: "background 0.1s",
  },
  calDay: {
    fontSize: 13,
    fontWeight: 600,
  },
  calHours: {
    fontSize: 10,
    color: "#34d399",
    fontWeight: 500,
  },
  weekGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 6,
  },
  weekCell: {
    borderRadius: 8,
    padding: "8px 4px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
  },
  weekDayName: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 600,
  },
  weekDayHours: {
    fontSize: 14,
    fontWeight: 700,
  },
  weekTotals: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    paddingTop: 12,
    borderTop: "1px solid #334155",
  },
  totalItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: "1 1 80px",
  },
  totalLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 600,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 700,
  },
  chartTitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 4,
    fontWeight: 600,
  },
  exportRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  help: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  entryList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  entryCard: {
    ...elevated,
    background: "#1e293b",
    padding: "12px 16px",
    borderRadius: 10,
  },
  entryRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  entryDate: {
    fontSize: 13,
    fontWeight: 700,
    color: "#e2e8f0",
    minWidth: 90,
  },
  entryTime: {
    fontSize: 13,
    color: "#94a3b8",
  },
  entryPause: {
    fontSize: 12,
    color: "#64748b",
  },
  entryHours: {
    fontSize: 14,
    fontWeight: 700,
    color: "#34d399",
    marginLeft: "auto",
  },
  entryNote: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "#f87171",
    fontSize: 16,
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: 4,
  },
  empty: {
    color: "#64748b",
    fontSize: 14,
    padding: 16,
  },
};
