"use strict";

/* ---------- State ---------- */
let assignments = []; // each: { name, time, marks }
const MAX_TIME_FOR_TABLE = 200; // keeps the DP table readable in the browser

/* ---------- Element shortcuts ---------- */
const $ = (id) => document.getElementById(id);
const availableInput = $("availableTime");
const nameInput = $("name");
const timeInput = $("time");
const marksInput = $("marks");

/* =====================================================================
   0/1 KNAPSACK WITH DYNAMIC PROGRAMMING
   Assignment = item, time = weight, marks = value, available time = capacity.
   dp[i][t] = max marks using the first i assignments with t hours available.
   ===================================================================== */
function buildKnapsackTable(items, capacity) {
  const n = items.length;

  // (n+1) x (capacity+1) table. Row 0 = no assignments considered, so all zeros.
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const time = items[i - 1].time;   // weight of assignment i
    const marks = items[i - 1].marks; // value of assignment i

    for (let t = 0; t <= capacity; t++) {
      // Option 1: don't select assignment i
      const skip = dp[i - 1][t];

      // Option 2: select assignment i (only possible if it fits in t hours)
      let take = -Infinity;
      if (time <= t) {
        take = marks + dp[i - 1][t - time];
      }

      // dp[i][t] = max(dp[i-1][t], marks[i] + dp[i-1][t - time[i]])
      dp[i][t] = take > skip ? take : skip;
    }
  }
  return dp;
}

/* =====================================================================
   BACKTRACKING THROUGH THE DP TABLE
   Start at dp[n][T]. If dp[i][t] != dp[i-1][t], assignment i was selected,
   so subtract its time from t. Then move up to row i-1.
   ===================================================================== */
function backtrack(dp, items, capacity) {
  const selected = [];   // indexes into items
  const path = [];       // cells visited, used for highlighting
  let t = capacity;

  for (let i = items.length; i >= 1; i--) {
    path.push({ i, t });
    if (dp[i][t] !== dp[i - 1][t]) {
      selected.push(i - 1);   // assignment i was selected
      t -= items[i - 1].time; // use up its time
    }
    // else: dp[i][t] == dp[i-1][t], assignment i was not selected
  }

  selected.reverse(); // restore original order
  return { selected, path };
}

/* ---------- Validation helpers ---------- */
function showMessage(el, text) {
  el.textContent = text;
  el.hidden = !text;
}

function validateAssignmentInput(name, timeStr, marksStr) {
  if (name.trim() === "") return "Enter an assignment name.";
  if (timeStr.trim() === "") return "Enter the time required in hours.";
  if (marksStr.trim() === "") return "Enter the expected marks.";
  const time = Number(timeStr);
  const marks = Number(marksStr);
  if (!Number.isFinite(time) || !Number.isFinite(marks)) return "Time and marks must be numbers.";
  if (time < 0 || marks < 0) return "Time and marks cannot be negative.";
  if (time === 0) return "Time required must be at least 1 hour.";
  if (!Number.isInteger(time)) return "Time must be a whole number of hours (the DP table has one column per hour).";
  return "";
}

function validateAvailableTime() {
  const raw = availableInput.value.trim();
  if (raw === "") return "Enter your available time in hours.";
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return "Available time cannot be negative.";
  if (value === 0) return "Available time is zero, so no assignment can be done. Enter at least 1 hour.";
  if (!Number.isInteger(value)) return "Available time must be a whole number of hours.";
  if (value > MAX_TIME_FOR_TABLE) return `Available time is limited to ${MAX_TIME_FOR_TABLE} hours so the DP table stays readable.`;
  return "";
}

/* ---------- Assignment list ---------- */
function addAssignment() {
  const error = validateAssignmentInput(nameInput.value, timeInput.value, marksInput.value);
  showMessage($("formError"), error);
  if (error) return;

  assignments.push({
    name: nameInput.value.trim(),
    time: Number(timeInput.value),
    marks: Number(marksInput.value),
  });
  nameInput.value = timeInput.value = marksInput.value = "";
  nameInput.focus();
  renderAssignments();
}

function deleteAssignment(index) {
  assignments.splice(index, 1);
  renderAssignments();
}

function renderAssignments() {
  const body = document.querySelector("#assignmentTable tbody");
  body.innerHTML = "";
  $("results").hidden = true;

  if (assignments.length === 0) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.className = "empty";
    cell.textContent = "No assignments yet. Add one above or load the sample data.";
    return;
  }

  assignments.forEach((a, index) => {
    const row = body.insertRow();
    row.insertCell().textContent = index + 1;
    row.insertCell().textContent = a.name;
    row.insertCell().textContent = `${a.time} h`;
    row.insertCell().textContent = a.marks;
    row.insertCell().textContent = (a.marks / a.time).toFixed(2); // information only
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteAssignment(index));
    row.insertCell().appendChild(del);
  });
}

function loadSampleData() {
  availableInput.value = 10;
  assignments = [
    { name: "Assignment 1", time: 2, marks: 20 },
    { name: "Assignment 2", time: 3, marks: 30 },
    { name: "Assignment 3", time: 4, marks: 35 },
    { name: "Assignment 4", time: 5, marks: 50 },
    { name: "Assignment 5", time: 6, marks: 55 },
  ];
  showMessage($("formError"), "");
  showMessage($("solveError"), "");
  renderAssignments();
}

function clearAll() {
  assignments = [];
  availableInput.value = "";
  showMessage($("formError"), "");
  showMessage($("solveError"), "");
  renderAssignments();
}

/* ---------- Solve and display ---------- */
function solve() {
  const solveError = $("solveError");
  const timeError = validateAvailableTime();
  if (timeError) return showMessage(solveError, timeError);
  if (assignments.length === 0) return showMessage(solveError, "Add at least one assignment first.");
  showMessage(solveError, "");

  const capacity = Number(availableInput.value);
  const dp = buildKnapsackTable(assignments, capacity);      // 1. fill the DP table
  const { selected, path } = backtrack(dp, assignments, capacity); // 2. backtrack

  const maxMarks = dp[assignments.length][capacity];
  const timeUsed = selected.reduce((sum, i) => sum + assignments[i].time, 0);
  renderResults(dp, selected, path, maxMarks, timeUsed, capacity);
}

function renderResults(dp, selected, path, maxMarks, timeUsed, capacity) {
  $("results").hidden = false;
  $("rMarks").textContent = maxMarks;
  $("rUsed").textContent = timeUsed;
  $("rLeft").textContent = capacity - timeUsed;

  // Helpful notes for edge cases
  const tooLong = assignments.filter((a) => a.time > capacity).map((a) => a.name);
  const note = $("rNote");
  if (selected.length === 0) {
    note.textContent = "No assignment fits in the available time, so nothing can be selected.";
  } else if (tooLong.length) {
    note.textContent = `Needs more than ${capacity} hours on its own, so it cannot be selected: ${tooLong.join(", ")}.`;
  } else {
    note.textContent = "";
  }
  note.hidden = note.textContent === "";

  const selectedSet = new Set(selected);
  const selList = $("selectedList");
  const unselList = $("unselectedList");
  selList.innerHTML = unselList.innerHTML = "";

  assignments.forEach((a, i) => {
    const li = document.createElement("li");
    if (selectedSet.has(i)) {
      li.textContent = `✓ ${a.name} — ${a.time} hours — ${a.marks} marks`;
      selList.appendChild(li);
    } else {
      li.textContent = `${a.name} — ${a.time} hours — ${a.marks} marks`;
      unselList.appendChild(li);
    }
  });
  if (!selList.children.length) selList.innerHTML = "<li>None</li>";
  if (!unselList.children.length) unselList.innerHTML = "<li>None, every assignment was selected.</li>";

  renderDpTable(dp, selectedSet, path, capacity);
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDpTable(dp, selectedSet, path, capacity) {
  const table = $("dpTable");
  table.innerHTML = "";
  const n = assignments.length;

  const pathKeys = new Set(path.map((p) => `${p.i},${p.t}`));

  // Header row: available time 0..T
  const head = table.insertRow();
  const corner = document.createElement("th");
  corner.textContent = "Assignment \\ Time";
  corner.className = "rowhead";
  head.appendChild(corner);
  for (let t = 0; t <= capacity; t++) {
    const th = document.createElement("th");
    th.textContent = t;
    head.appendChild(th);
  }

  for (let i = 0; i <= n; i++) {
    const row = table.insertRow();
    const th = document.createElement("th");
    th.className = "rowhead";
    th.textContent = i === 0 ? "None (i = 0)" : `${i}. ${assignments[i - 1].name}`;
    row.appendChild(th);

    for (let t = 0; t <= capacity; t++) {
      const td = row.insertCell();
      td.textContent = dp[i][t];
      if (i === n && t === capacity) td.className = "final";
      else if (pathKeys.has(`${i},${t}`)) {
        td.className = selectedSet.has(i - 1) ? "path pick" : "path";
      }
    }
  }
}

/* ---------- Event wiring ---------- */
$("addBtn").addEventListener("click", addAssignment);
$("sampleBtn").addEventListener("click", loadSampleData);
$("clearBtn").addEventListener("click", clearAll);
$("solveBtn").addEventListener("click", solve);
[nameInput, timeInput, marksInput].forEach((el) =>
  el.addEventListener("keydown", (e) => { if (e.key === "Enter") addAssignment(); })
);

renderAssignments();
