// ─────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────
function showSection(sectionId, btnEl) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btnEl) {
    btnEl.classList.add("active");
  }
}

// ─────────────────────────────────────────────
//  API HELPERS
// ─────────────────────────────────────────────
async function apiPost(url, body) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    console.log(`[API] POST ${url}:`, json);
    return json;
  } catch (err) {
    console.error("[API] POST error", url, err);
    return { status: "error", message: "Could not connect to server." };
  }
}

async function apiDelete(url) {
  try {
    const res = await fetch(url, { method: "DELETE" });
    const json = await res.json();
    console.log(`[API] DELETE ${url}:`, json);
    return json;
  } catch (err) {
    console.error("[API] DELETE error", url, err);
    return { status: "error", message: "Could not connect to server." };
  }
}

// ─────────────────────────────────────────────
//  SYNC — load everything from backend
// ─────────────────────────────────────────────
async function syncData() {
  try {
    console.log("[SYNC] Starting sync...");
    const response = await fetch("/api/init");
    const data = await response.json();
    console.log("[SYNC] Data received:", data);

    // Parse tasks
    window.tasks = (data.tasks || []).map(t => ({
      id: t.id,
      title: t.title || "Untitled",
      due_date: t.due_date || "",
      priority: t.priority || "",
      description: t.description || "",
      completed: !!t.completed
    }));
    console.log("[SYNC] Tasks parsed:", window.tasks);

    // Parse spending
    window.spending = (data.spending || []).map(s => ({
      id: s.id,
      title: s.category || s.description || "Expense",
      amount: Number(s.amount) || 0,
      type: s.type || "expense",
      date: s.date || ""
    }));
    console.log("[SYNC] Spending parsed:", window.spending);

    // Parse reminders
    window.reminders = (data.reminders || []);
    console.log("[SYNC] Reminders:", window.reminders);

    // Parse schedule
    window.schedule = (data.schedule || []);
    console.log("[SYNC] Schedule:", window.schedule);

    // Render all
    renderTasks();
    renderSpending();
    renderReminders();
    renderSchedule();
    updateDashboard();
    console.log("[SYNC] ✅ All data synced and rendered");
  } catch (err) {
    console.error("[SYNC] Failed:", err);
  }
}

// ─────────────────────────────────────────────
//  RENDER FUNCTIONS
// ─────────────────────────────────────────────
function renderTasks() {
  const container = document.getElementById("taskList");
  console.log("[RENDER] Tasks container:", container, "Tasks data:", window.tasks);
  
  if (!container) {
    console.error("[RENDER] taskList container not found!");
    return;
  }

  if (!window.tasks || window.tasks.length === 0) {
    container.innerHTML = `<p style="color:#999; padding:20px; text-align:center;">No tasks yet. Add one above!</p>`;
    return;
  }

  let html = "";
  window.tasks.forEach(t => {
    html += `
      <div class="task-card">
        <div class="task-info">
          <h3 style="margin:0 0 8px; ${t.completed ? 'text-decoration:line-through;color:#888;' : ''}">${escapeHtml(t.title)}</h3>
          ${t.due_date ? `<p style="margin:4px 0; font-size:12px; color:#999;">📅 Due: ${t.due_date.slice(0,16)}</p>` : ""}
          ${t.priority ? `<p style="margin:4px 0; font-size:12px; color:#999;">Priority: ${t.priority}</p>` : ""}
          <p style="margin:4px 0; font-size:12px; color:#999;">Status: ${t.completed ? "✅ Completed" : "⏳ Pending"}</p>
        </div>
        <div class="task-actions">
          ${t.completed
            ? `<span class="done-badge">Done ✅</span>`
            : `<button onclick="completeTask(${t.id})" style="padding:8px 12px; background:#b91c1c; color:white; border:none; border-radius:8px; cursor:pointer;">Complete</button>`}
          <button class="delete-btn" onclick="deleteTask(${t.id})" style="padding:8px 12px; background:#323232; color:white; border:none; border-radius:8px; cursor:pointer; margin-left:8px;">Delete</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  console.log("[RENDER] Tasks rendered successfully");
}

function renderSpending() {
  const container = document.getElementById("spendingList");
  console.log("[RENDER] Spending container:", container, "Spending data:", window.spending);
  
  if (!container) {
    console.error("[RENDER] spendingList container not found!");
    return;
  }

  if (!window.spending || window.spending.length === 0) {
    container.innerHTML = `<p style="color:#999; padding:20px; text-align:center;">No expenses yet. Add one above!</p>`;
    return;
  }

  let html = "";
  window.spending.forEach(s => {
    html += `
      <div class="spending-card">
        <div class="spending-info">
          <h3 style="margin:0 0 8px;">${escapeHtml(s.title)}</h3>
          <p style="margin:4px 0; font-size:12px; color:#999;">💵 $${Number(s.amount).toFixed(2)} | ${s.type} | ${s.date ? s.date.slice(0,10) : 'N/A'}</p>
        </div>
        <div class="spending-actions">
          <button class="delete-btn" onclick="deleteSpending(${s.id})" style="padding:8px 12px; background:#323232; color:white; border:none; border-radius:8px; cursor:pointer;">Delete</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  console.log("[RENDER] Spending rendered successfully");
}

function renderReminders() {
  const container = document.getElementById("reminderList");
  console.log("[RENDER] Reminders container:", container, "Reminders data:", window.reminders);
  
  if (!container) {
    console.error("[RENDER] reminderList container not found!");
    return;
  }

  if (!window.reminders || window.reminders.length === 0) {
    container.innerHTML = `<p style="color:#999; padding:20px; text-align:center;">No reminders yet. Add one above!</p>`;
    return;
  }

  let html = "";
  window.reminders.forEach(r => {
    html += `
      <div class="reminder-card">
        <div class="reminder-info">
          <h3 style="margin:0 0 8px;">${escapeHtml(r.text)}</h3>
          ${r.remind_at ? `<p style="margin:4px 0; font-size:12px; color:#999;">🔔 Remind: ${r.remind_at}</p>` : ""}
        </div>
        <div class="reminder-actions">
          <button class="delete-btn" onclick="deleteReminder(${r.id})" style="padding:8px 12px; background:#323232; color:white; border:none; border-radius:8px; cursor:pointer;">Delete</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  console.log("[RENDER] Reminders rendered successfully");
}

function renderSchedule() {
  const container = document.getElementById("scheduleList");
  console.log("[RENDER] Schedule container:", container, "Schedule data:", window.schedule);
  
  if (!container) {
    console.error("[RENDER] scheduleList container not found!");
    return;
  }

  if (!window.schedule || window.schedule.length === 0) {
    container.innerHTML = `<p style="color:#999; padding:20px; text-align:center;">No events yet. Add one above!</p>`;
    return;
  }

  let html = "";
  window.schedule.forEach(s => {
    html += `
      <div class="schedule-card">
        <div class="schedule-info">
          <h3 style="margin:0 0 8px;">${escapeHtml(s.title)}</h3>
          <div style="margin-top:6px;">
            ${s.date ? `<p style="margin:4px 0; font-size:12px; color:#999;">📅 ${s.date}</p>` : ""}
            ${s.time ? `<p style="margin:4px 0; font-size:12px; color:#999;">🕐 ${s.time}</p>` : ""}
            ${s.duration ? `<p style="margin:4px 0; font-size:12px; color:#999;">⏱️ ${s.duration}</p>` : ""}
            ${s.notes ? `<p style="margin:4px 0; font-size:12px; color:#999;">📝 ${escapeHtml(s.notes)}</p>` : ""}
          </div>
        </div>
        <div class="schedule-actions">
          <button class="delete-btn" onclick="deleteSchedule(${s.id})" style="padding:8px 12px; background:#323232; color:white; border:none; border-radius:8px; cursor:pointer;">Delete</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  console.log("[RENDER] Schedule rendered successfully");
}

// ─────────────────────────────────────────────
//  DASHBOARD STATS
// ─────────────────────────────────────────────
function updateDashboard() {
  const total      = (window.tasks || []).length;
  const completed  = (window.tasks || []).filter(t => t.completed).length;
  const pending    = total - completed;
  const totalSpend = (window.spending || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const remCount   = (window.reminders || []).length;
  const schedCount = (window.schedule || []).length;

  console.log(`[DASHBOARD] Tasks: ${total} | Completed: ${completed} | Spending: $${totalSpend.toFixed(2)} | Reminders: ${remCount} | Schedule: ${schedCount}`);

  setText("totalTasksCard",     total);
  setText("completedTasksCard", completed);
  setText("remindersCard",      remCount);
  setText("dashboardSpending",  `$${totalSpend.toFixed(2)}`);

  setText("todayCompleted", completed);
  setText("todayPending",   pending);
  setText("todaySpending",  `$${totalSpend.toFixed(2)}`);
  setText("tomorrowEvents", schedCount);

  setText("totalSpending", `$${totalSpend.toFixed(2)}`);
  setText("weekSpending",  `$${totalSpend.toFixed(2)}`);

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  setText("productivityPct", `${pct}%`);
  const arc = document.getElementById("productivityArc");
  if (arc) {
    const circumference = 251.2;
    arc.setAttribute("stroke-dashoffset", (circumference - (pct / 100) * circumference).toFixed(1));
  }

  updateUpcomingPanel();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateUpcomingPanel() {
  const container = document.getElementById("upcomingTasks");
  if (!container) return;
  const pendingTasks = (window.tasks || []).filter(t => !t.completed).slice(0, 3);
  if (!pendingTasks.length) {
    container.innerHTML = `<p style="color:#808098;font-size:12px">All tasks completed! 🎉</p>`;
    return;
  }
  const colors   = ["#a070e0", "#3878dc", "#34c759", "#ffaa00", "#e05252"];
  const badges   = ["High", "Medium", "Low"];
  const badgeCls = ["high", "med", "low"];
  container.innerHTML = pendingTasks.map((t, i) => `
    <div class="upcoming-item">
      <div class="upcoming-dot" style="background:${colors[i % colors.length]}"></div>
      <div class="upcoming-info">
        <div class="upcoming-name">${escapeHtml(t.title)}</div>
        <div class="upcoming-time">${t.due_date ? t.due_date.slice(0,10) : "No due date"}</div>
      </div>
      <span class="priority-badge ${badgeCls[i % 3]}">${t.priority || badges[i % 3]}</span>
    </div>
  `).join("");
}

// ─────────────────────────────────────────────
//  TASKS
// ─────────────────────────────────────────────
async function addTask() {
  const input = document.getElementById("taskInput");
  const text = input?.value.trim();
  if (!text) {
    alert("Please enter a task!");
    return;
  }
  console.log("[ADD TASK] Input:", text);
  setLoading("taskAddBtn", true);
  const res = await apiPost("/api/nlp", { message: text });
  setLoading("taskAddBtn", false);
  console.log("[ADD TASK] Response:", res);
  if (res.status !== "success") {
    alert(res.message || "Could not add task. Try: 'Finish math by Friday'");
    return;
  }
  input.value = "";
  await syncData();
}

async function completeTask(id) {
  console.log("[COMPLETE TASK] ID:", id);
  await fetch(`/api/tasks/complete/${id}`, { method: "POST" });
  await syncData();
}

async function deleteTask(id) {
  console.log("[DELETE TASK] ID:", id);
  await apiDelete(`/api/tasks/${id}`);
  await syncData();
}

// ─────────────────────────────────────────────
//  REMINDERS
// ─────────────────────────────────────────────
async function addReminder() {
  const input = document.getElementById("reminderInput");
  const text = input?.value.trim();
  if (!text) {
    alert("Please enter a reminder!");
    return;
  }
  console.log("[ADD REMINDER] Input:", text);
  setLoading("reminderAddBtn", true);
  const res = await apiPost("/api/reminders", { text, remind_at: "" });
  setLoading("reminderAddBtn", false);
  console.log("[ADD REMINDER] Response:", res);
  if (res.status !== "success") {
    alert(res.message || "Could not add reminder.");
    return;
  }
  input.value = "";
  await syncData();
}

async function deleteReminder(id) {
  console.log("[DELETE REMINDER] ID:", id);
  await apiDelete(`/api/reminders/${id}`);
  await syncData();
}

// ─────────────────────────────────────────────
//  SCHEDULE
// ─────────────────────────────────────────────
async function addScheduleItem() {
  const titleInput = document.getElementById("scheduleTitleInput");
  const timeInput  = document.getElementById("scheduleTimeInput");
  const dateInput  = document.getElementById("scheduleDateInput");
  const title = titleInput?.value.trim();
  if (!title) {
    alert("Please enter an event title!");
    return;
  }
  const time  = timeInput?.value.trim()  || "";
  const date  = dateInput?.value.trim()  || "";
  console.log("[ADD SCHEDULE] Title:", title, "Date:", date, "Time:", time);
  setLoading("scheduleAddBtn", true);
  const res = await apiPost("/api/schedule", { title, date, time, duration: "", notes: "" });
  setLoading("scheduleAddBtn", false);
  console.log("[ADD SCHEDULE] Response:", res);
  if (res.status !== "success") {
    alert(res.message || "Could not add event.");
    return;
  }
  titleInput.value = "";
  if (timeInput) timeInput.value = "";
  if (dateInput) dateInput.value = "";
  await syncData();
}

async function deleteSchedule(id) {
  console.log("[DELETE SCHEDULE] ID:", id);
  await apiDelete(`/api/schedule/${id}`);
  await syncData();
}

// ─────────────────────────────────────────────
//  SPENDING
// ─────────────────────────────────────────────
async function addExpense() {
  const input = document.getElementById("expenseTitleInput");
  const text  = input?.value.trim();
  if (!text) {
    alert("Please enter an expense!");
    return;
  }
  console.log("[ADD EXPENSE] Input:", text);
  setLoading("spendingAddBtn", true);
  const res = await apiPost("/api/nlp", { message: text });
  setLoading("spendingAddBtn", false);
  console.log("[ADD EXPENSE] Response:", res);
  if (res.status !== "success") {
    alert(res.message || "Could not add expense. Try: 'Coffee 5' or 'I spent 20 on food'");
    return;
  }
  input.value = "";
  await syncData();
}

async function deleteSpending(id) {
  console.log("[DELETE SPENDING] ID:", id);
  await apiDelete(`/api/finance/${id}`);
  await syncData();
}

// ─────────────────────────────────────────────
//  AI CHAT
// ─────────────────────────────────────────────
async function sendMessage() {
  const input    = document.getElementById("user-input");
  const messages = document.getElementById("messages");
  const text     = input?.value.trim();
  if (!text || !messages) return;

  console.log("[CHAT] Sending:", text);
  appendMessage(messages, "You", text, "#e8e8f0");
  input.value = "";

  const typingId = "typing-" + Date.now();
  messages.innerHTML += `<p id="${typingId}" style="color:#606078;font-style:italic;margin:6px 0;font-size:13px">LifePilot is thinking...</p>`;
  messages.scrollTop = messages.scrollHeight;

  const res   = await apiPost("/api/chat", { message: text });
  const reply = res?.message || "Sorry, I couldn't get a response.";

  document.getElementById(typingId)?.remove();
  appendMessage(messages, "LifePilot", reply, "#b91c1c");
  messages.scrollTop = messages.scrollHeight;

  await syncData();
}

function appendMessage(container, sender, text, color) {
  const p = document.createElement("p");
  p.style.cssText = "margin:10px 0;line-height:1.5;font-size:13px";
  p.innerHTML = `<strong style="color:${color}">${sender}:</strong> <span style="color:#c0c0d8;white-space:pre-wrap">${escapeHtml(text)}</span>`;
  container.appendChild(p);
}

// ─────────────────────────────────────────────
//  VOICE INPUT
// ─────────────────────────────────────────────
async function startVoiceInput(targetInputId, event) {
  const targetInput = document.getElementById(targetInputId);
  const micBtn      = event?.currentTarget;
  if (!targetInput) {
    console.error("[VOICE] Target input not found:", targetInputId);
    return;
  }
  if (micBtn) micBtn.classList.add("recording");
  try {
    console.log("[VOICE] Listening...");
    const res  = await fetch("/voice/listen", { method: "POST" });
    const data = await res.json();
    console.log("[VOICE] Result:", data);
    if (data.status === "success" && data.text?.trim()) {
      targetInput.value = data.text.trim();
      targetInput.focus();
      if      (targetInputId === "user-input")         await sendMessage();
      else if (targetInputId === "taskInput")           await addTask();
      else if (targetInputId === "reminderInput")       await addReminder();
      else if (targetInputId === "scheduleTitleInput")  await addScheduleItem();
      else if (targetInputId === "expenseTitleInput")   await addExpense();
    } else {
      alert(data.message || "No speech detected.");
    }
  } catch (err) {
    console.error("[VOICE] Error:", err);
    alert("Voice input failed.");
  } finally {
    if (micBtn) micBtn.classList.remove("recording");
  }
}

// ─────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) btn.dataset.orig = btn.textContent, btn.textContent = "...";
  else btn.textContent = btn.dataset.orig || btn.textContent;
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  console.log("[INIT] LifePilot initializing...");
  window.tasks     = [];
  window.spending  = [];
  window.reminders = [];
  window.schedule  = [];

  syncData();

  // Enter key bindings
  [
    ["taskInput",          addTask],
    ["reminderInput",      addReminder],
    ["scheduleTitleInput", addScheduleItem],
    ["expenseTitleInput",  addExpense],
    ["user-input",         sendMessage],
  ].forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("keydown", e => { if (e.key === "Enter") fn(); });
      console.log(`[INIT] Enter binding set for: ${id}`);
    } else {
      console.warn(`[INIT] Element not found: ${id}`);
    }
  });

  // auto-sync every 5 seconds
  setInterval(() => {
    console.log("[AUTO-SYNC] Running periodic sync...");
    syncData();
  }, 5000);

  console.log("[INIT] ✅ LifePilot ready!");
});