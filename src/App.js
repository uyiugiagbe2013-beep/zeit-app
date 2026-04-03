import { useState } from "react";

export default function App() {
  const [text, setText] = useState("");

  return (
    <div style={{ padding: 40 }}>
      <h1>⏱ Zeiterfassung App</h1>

      <input
        placeholder="Arbeitsbeginn (z. B. 08:00)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <p>Deine Eingabe: {text}</p>
    </div>
  );
}