const STORAGE_KEY = "strengthLog.v1";
const quickAdds = [5, 10, 15, 20, 25, 50];
const exerciseOptions = [
  "Planks",
  "Glute bridges",
  "Deadlifts",
  "Lunges",
  "Push-ups",
  "Resistance bands",
  "Dumbbells",
  "Core",
  "Other"
];

const defaults = {
  goals: { daily: 50, weekly: 350, monthly: 1500 },
  days: {}
};

let data = loadData();
let editingDate = null;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && saved.days && saved.goals ? saved : clone(defaults);
  } catch {
    return clone(defaults);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDay(key = localDateKey()) {
  if (!data.days[key]) {
    data.days[key] = { entries: [], otherStrength: false, exercises: [], notes: "" };
  }
  if (!Array.isArray(data.days[key].entries)) data.days[key].entries = [];
  if (!Array.isArray(data.days[key].exercises)) data.days[key].exercises = [];
  if (typeof data.days[key].notes !== "string") data.days[key].notes = "";
  if (typeof data.days[key].otherStrength !== "boolean") data.days[key].otherStrength = false;
  return data.days[key];
}

function totalForDay(key) {
  return (data.days[key]?.entries || []).reduce((sum, value) => sum + Number(value || 0), 0);
}

function dayHasWorkout(key) {
  const d = data.days[key];
  return Boolean(d && (totalForDay(key) > 0 || d.otherStrength || d.notes.trim()));
}

function dateLabel(key, options = { weekday: "short", month: "short", day: "numeric" }) {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, options);
}

function recentDateKeys(count) {
  const keys = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.push(localDateKey(d));
  }
  return keys;
}

function sumForDates(keys) {
  return keys.reduce((sum, key) => sum + totalForDay(key), 0);
}

function calculateStreak() {
  let count = 0;
  const d = new Date();
  while (true) {
    const key = localDateKey(d);
    if (!dayHasWorkout(key)) break;
    count += 1;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function getBestDay() {
  const totals = Object.keys(data.days).map(totalForDay);
  return totals.length ? Math.max(...totals) : 0;
}

function addSquats(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return;
  getDay().entries.push(n);
  saveData();
  render();
}

function setDayTotal(key, total) {
  const n = Math.max(0, Number(total) || 0);
  getDay(key).entries = n > 0 ? [n] : [];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function renderQuickAdds() {
  const grid = document.getElementById("quickGrid");
  grid.innerHTML = "";
  quickAdds.forEach(amount => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `+${amount}`;
    button.addEventListener("click", () => addSquats(amount));
    grid.appendChild(button);
  });
}

function renderCustomPicker() {
  const select = document.getElementById("customSelect");
  select.innerHTML = "";
  for (let i = 1; i <= 200; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i} squats`;
    select.appendChild(option);
  }
  select.value = "25";
}

function renderHome() {
  const today = localDateKey();
  const total = totalForDay(today);
  const goal = Number(data.goals.daily) || 50;
  const percent = Math.min(100, Math.round((total / goal) * 100));

  document.getElementById("todayDate").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  document.getElementById("todayTotal").textContent = total;
  document.getElementById("dailyProgress").style.width = `${percent}%`;
  document.getElementById("dailyGoalText").textContent = `Goal: ${total} / ${goal}`;

  renderOtherStrength();
}

function renderOtherStrength() {
  const d = getDay();
  document.getElementById("otherYes").classList.toggle("active", d.otherStrength);
  document.getElementById("otherNo").classList.toggle("active", !d.otherStrength);
  document.getElementById("exercisePanel").classList.toggle("hidden", !d.otherStrength);
  document.getElementById("exerciseNotes").value = d.notes;

  const chips = document.getElementById("exerciseChips");
  chips.innerHTML = "";
  exerciseOptions.forEach(name => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = name;
    chip.classList.toggle("selected", d.exercises.includes(name));
    chip.addEventListener("click", () => {
      if (d.exercises.includes(name)) {
        d.exercises = d.exercises.filter(item => item !== name);
      } else {
        d.exercises.push(name);
      }
      d.otherStrength = d.exercises.length > 0 || d.notes.trim().length > 0;
      saveData();
      render();
    });
    chips.appendChild(chip);
  });

  const summary = document.getElementById("exerciseSummary");
  if (!d.otherStrength) {
    summary.textContent = "No other strength training logged today.";
  } else if (d.exercises.length) {
    summary.textContent = `Logged today: ${d.exercises.join(", ")}`;
  } else {
    summary.textContent = "Other strength logged today.";
  }
}

function renderProgress() {
  const week = recentDateKeys(7);
  const month = recentDateKeys(30);
  const weekTotal = sumForDates(week);
  const monthTotal = sumForDates(month);
  const weeklyPercent = Math.min(100, Math.round((weekTotal / (Number(data.goals.weekly) || 350)) * 100));
  const monthlyPercent = Math.min(100, Math.round((monthTotal / (Number(data.goals.monthly) || 1500)) * 100));

  document.getElementById("streak").textContent = calculateStreak();
  document.getElementById("weekTotal").textContent = weekTotal;
  document.getElementById("monthTotal").textContent = monthTotal;
  document.getElementById("bestDay").textContent = getBestDay();
  document.getElementById("consistencyText").textContent = `${week.filter(dayHasWorkout).length} workout days in the last 7 days`;
  document.getElementById("weeklyGoalText").textContent = `${weeklyPercent}%`;
  document.getElementById("monthlyGoalText").textContent = `${monthlyPercent}%`;

  renderChart();
}

function renderChart() {
  const chart = document.getElementById("chart");
  const keys = recentDateKeys(14);
  const max = Math.max(...keys.map(totalForDay), Number(data.goals.daily) || 50, 1);
  chart.innerHTML = "";

  keys.forEach(key => {
    const barWrap = document.createElement("div");
    barWrap.className = "bar-wrap";

    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.height = `${Math.max(4, (totalForDay(key) / max) * 100)}%`;
    bar.title = `${dateLabel(key)}: ${totalForDay(key)} squats`;

    const label = document.createElement("div");
    label.className = "bar-label";
    label.textContent = dateLabel(key, { weekday: "short" }).slice(0, 1);

    barWrap.append(bar, label);
    chart.appendChild(barWrap);
  });
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const dates = Object.keys(data.days).filter(dayHasWorkout).sort().reverse();

  if (!dates.length) {
    list.innerHTML = '<p class="muted">No history yet. Your logged days will appear here.</p>';
    return;
  }

  list.innerHTML = "";
  dates.forEach(key => {
    const d = getDay(key);
    const exercises = d.otherStrength ? (d.exercises.join(", ") || "Yes") : "No";
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-date">${dateLabel(key, { weekday: "long", month: "short", day: "numeric" })}</div>
      <div class="history-details">${totalForDay(key)} squats</div>
      <div class="history-details">Other strength: ${escapeHtml(exercises)}</div>
      ${d.notes ? `<div class="history-details">Notes: ${escapeHtml(d.notes)}</div>` : ""}
      <button class="edit-day" data-date="${key}" type="button">Edit day</button>
    `;
    list.appendChild(item);
  });

  document.querySelectorAll(".edit-day").forEach(button => {
    button.addEventListener("click", () => openEditDialog(button.dataset.date));
  });
}

function renderGoals() {
  document.getElementById("dailyGoal").value = data.goals.daily;
  document.getElementById("weeklyGoal").value = data.goals.weekly;
  document.getElementById("monthlyGoal").value = data.goals.monthly;
}

function renderEditChips(key) {
  const d = getDay(key);
  const box = document.getElementById("editChips");
  box.innerHTML = "";
  exerciseOptions.forEach(name => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = name;
    chip.classList.toggle("selected", d.exercises.includes(name));
    chip.addEventListener("click", () => {
      if (d.exercises.includes(name)) {
        d.exercises = d.exercises.filter(item => item !== name);
      } else {
        d.exercises.push(name);
      }
      chip.classList.toggle("selected", d.exercises.includes(name));
    });
    box.appendChild(chip);
  });
}

function openEditDialog(key) {
  editingDate = key;
  const d = getDay(key);
  document.getElementById("editTitle").textContent = `Edit ${dateLabel(key, { weekday: "long", month: "short", day: "numeric" })}`;
  document.getElementById("editSquats").value = totalForDay(key);
  document.getElementById("editNotes").value = d.notes;
  renderEditChips(key);
  document.getElementById("editDialog").showModal();
}

function exportCsv() {
  const rows = [["date", "squats", "other_strength", "exercises", "notes"]];
  Object.keys(data.days).sort().forEach(key => {
    const d = getDay(key);
    rows.push([
      key,
      totalForDay(key),
      d.otherStrength ? "yes" : "no",
      d.exercises.join("; "),
      d.notes
    ]);
  });

  const csv = rows
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "strength-log.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function setupEvents() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.toggle("active", screen.id === button.dataset.screen);
      });
      document.querySelectorAll(".nav-btn").forEach(nav => nav.classList.toggle("active", nav === button));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.getElementById("customBtn").addEventListener("click", () => document.getElementById("customDialog").showModal());
  document.getElementById("cancelCustom").addEventListener("click", () => document.getElementById("customDialog").close());
  document.getElementById("addCustom").addEventListener("click", () => {
    addSquats(Number(document.getElementById("customSelect").value));
    document.getElementById("customDialog").close();
  });

  document.getElementById("repeatBtn").addEventListener("click", () => {
    const entries = getDay().entries;
    if (entries.length) addSquats(entries[entries.length - 1]);
  });

  document.getElementById("undoBtn").addEventListener("click", () => {
    getDay().entries.pop();
    saveData();
    render();
  });

  document.getElementById("clearTodayBtn").addEventListener("click", () => {
    if (confirm("Clear today's squat entries?")) {
      getDay().entries = [];
      saveData();
      render();
    }
  });

  document.getElementById("otherYes").addEventListener("click", () => {
    getDay().otherStrength = true;
    saveData();
    render();
  });

  document.getElementById("otherNo").addEventListener("click", () => {
    const d = getDay();
    d.otherStrength = false;
    d.exercises = [];
    d.notes = "";
    saveData();
    render();
  });

  document.getElementById("exerciseNotes").addEventListener("input", event => {
    const d = getDay();
    d.notes = event.target.value;
    d.otherStrength = d.notes.trim().length > 0 || d.exercises.length > 0;
    saveData();
    renderProgress();
    renderHistory();
  });

  document.getElementById("saveGoals").addEventListener("click", () => {
    data.goals.daily = Number(document.getElementById("dailyGoal").value) || 50;
    data.goals.weekly = Number(document.getElementById("weeklyGoal").value) || 350;
    data.goals.monthly = Number(document.getElementById("monthlyGoal").value) || 1500;
    saveData();
    render();
  });

  document.getElementById("cancelEdit").addEventListener("click", () => document.getElementById("editDialog").close());
  document.getElementById("saveEdit").addEventListener("click", () => {
    if (!editingDate) return;
    const d = getDay(editingDate);
    setDayTotal(editingDate, document.getElementById("editSquats").value);
    d.notes = document.getElementById("editNotes").value;
    d.otherStrength = d.exercises.length > 0 || d.notes.trim().length > 0;
    saveData();
    document.getElementById("editDialog").close();
    render();
  });

  document.getElementById("exportBtn").addEventListener("click", exportCsv);

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Reset all Strength Log data on this device?")) {
      data = clone(defaults);
      saveData();
      render();
    }
  });
}

function render() {
  renderHome();
  renderProgress();
  renderHistory();
  renderGoals();
}

renderQuickAdds();
renderCustomPicker();
setupEvents();
render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
