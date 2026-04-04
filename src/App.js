import React, { useState } from 'react';

function App() {
  const [entries, setEntries] = useState(
    () => JSON.parse(localStorage.getItem('timeEntries')) || []
  );
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');

  const totalHours = entries.reduce((total, entry) => total + entry.hours, 0);

  function handleSubmit(event) {
    event.preventDefault();
    const newEntry = {
      description,
      hours: parseFloat(hours),
      date: new Date().toISOString(),
    };
    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    localStorage.setItem('timeEntries', JSON.stringify(updatedEntries));
    setDescription('');
    setHours('');
  }

  return (
    <div>
      <h1>Zeit App</h1>
      <form id="add-entry-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="description"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="number"
          name="hours"
          placeholder="Hours"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          min="0"
          step="0.5"
          required
        />
        <button type="submit">Add Entry</button>
      </form>
      <div id="entries">
        {entries.map((entry, index) => (
          <div key={index}>
            {entry.date}: {entry.description} - {entry.hours} hours
          </div>
        ))}
      </div>
      <p>Total hours: {totalHours}</p>
    </div>
  );
}

export default App;
