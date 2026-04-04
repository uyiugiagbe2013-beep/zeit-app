// Full Time Tracking Implementation

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
