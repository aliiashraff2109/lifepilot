function showSection(sectionId) {
  document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(btn => {
    if (btn.getAttribute("onclick")?.includes(`'${sectionId}'`)) {
      btn.classList.add("active");
    }
  });
}

async function callAPI(text) {
  console.log("[FRONTEND] Sending:", text);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    console.log("[FRONTEND] Response:", data);
    return data;
  } catch (err) {
    console.error("[FRONTEND] API error:", err);
    return { status: "error", message: "Could not connect to backend." };
  }
}

async function syncData() {
  try {
    const res = await fetch("/api/init");
    const data = await res.json();

    console.log("[FRONTEND] Init data:", data);

    window.tasks = (data.tasks || []).map(t => ({
      id: t.id,
      title: t.title || "Untitled Task",
      time: t.due_date || "",
      completed: !!t.completed
    }));

    window.spending = (data.spending || []).map(s => ({
      id: s.id,
      title: s.category || s.description || "Expense",
      amount: Number(s.amount) || 0,
      completed: false
    }));

    renderList(window.tasks, "taskList", "task");
    renderList(window.spending, "spendingList", "spending");
    updateDashboardCards();
  } catch (err) {
    console.error("[FRONTEND] Could not load database:", err);
  }
}

function renderList(listArray, containerId, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (!listArray || listArray.length === 0) {
    container.innerHTML = `<p class="empty-state">No ${type === "task" ? "tasks" : "spending records"} yet.</p>`;
    return;
  }

  listArray.forEach(item => {
    const div = document.createElement("div");
    div.className = `${type}-card`;

    if (type === "task") {
      div.innerHTML = `
        <div class="${type}-info">
          <h3 class="${item.completed ? "completed-task" : ""}">${item.title}</h3>
          ${item.time ? `<p>Time: ${item.time}</p>` : ""}
          <p>Status: ${item.completed ? "Completed" : "Pending"}</p>
        </div>
        <div class="${type}-actions">
          ${item.completed ? `<span class="done-badge">Done</span>` : `<button onclick="completeItem('task', ${item.id})">Complete</button>`}
          <button class="delete-btn" onclick="deleteItem('task', ${item.id})">Delete</button>
        </div>
      `;
    } else if (type === "spending") {
      div.innerHTML = `
        <div class="${type}-info">
          <h3>${item.title}</h3>
          <p>Amount: $${Number(item.amount).toFixed(2)}</p>
        </div>
        <div class="${type}-actions">
          <button class="delete-btn" onclick="deleteItem('spending', ${item.id})">Delete</button>
        </div>
      `;
    }

    container.appendChild(div);
  });
}

function updateDashboardCards() {
  const totalTasks = window.tasks?.length || 0;
  const completedTasks = window.tasks?.filter(t => t.completed).length || 0;
  const totalSpending = window.spending?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;

  const totalTasksCard = document.getElementById("totalTasksCard");
  const completedTasksCard = document.getElementById("completedTasksCard");
  const dashboardSpending = document.getElementById("dashboardSpending");
  const totalSpendingText = document.getElementById("totalSpending");

  if (totalTasksCard) totalTasksCard.textContent = totalTasks;
  if (completedTasksCard) completedTasksCard.textContent = completedTasks;
  if (dashboardSpending) dashboardSpending.textContent = `$${totalSpending.toFixed(2)}`;
  if (totalSpendingText) totalSpendingText.textContent = `$${totalSpending.toFixed(2)}`;
}

function buildTaskCommand(text) {
  return text;
}

function buildSpendingCommand(title, amount) {
  if (amount && title) return `I spent ${amount} on ${title}`;
  if (title) return title;
  return "";
}

async function addItem(type) {
  let inputId, amountId;

  switch (type) {
    case "task":
      inputId = "taskInput";
      break;
    case "spending":
      inputId = "expenseTitleInput";
      amountId = "expenseAmountInput";
      break;
    default:
      return;
  }

  const input = document.getElementById(inputId);
  if (!input) {
    console.error(`[FRONTEND] Missing input: ${inputId}`);
    return;
  }

  const rawText = input.value.trim();
  if (!rawText) return;

  let apiText = rawText;
  let amountValue = "";

  if (type === "task") {
    apiText = buildTaskCommand(rawText);
  }

  if (type === "spending") {
    const amountInput = document.getElementById(amountId);
    amountValue = amountInput ? amountInput.value.trim() : "";
    apiText = buildSpendingCommand(rawText, amountValue);
  }

  console.log("[FRONTEND] Final command:", apiText);

  const res = await callAPI(apiText);

  if (!res || res.status === "error") {
    console.error("[FRONTEND] Backend rejected request:", res?.message);
    alert(res?.message || "Could not process request.");
    return;
  }

  input.value = "";
  if (type === "spending") {
    const amountInput = document.getElementById(amountId);
    if (amountInput) amountInput.value = "";
  }

  await syncData();
}

async function completeItem(type, id) {
  if (type !== "task") return;

  try {
    const res = await fetch(`/api/tasks/complete/${id}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    console.log("[FRONTEND] Complete response:", data);
    await syncData();
  } catch (err) {
    console.error("[FRONTEND] Complete error:", err);
  }
}

async function deleteItem(type, id) {
  const url = type === "task" ? `/api/tasks/${id}` : `/api/finance/${id}`;

  try {
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    console.log("[FRONTEND] Delete response:", data);
    await syncData();
  } catch (err) {
    console.error("[FRONTEND] Delete error:", err);
  }
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const messages = document.getElementById("messages");

  if (!input || !messages || !input.value.trim()) return;

  const text = input.value.trim();
  messages.innerHTML += `<p><strong>You:</strong> ${text}</p>`;
  input.value = "";

  const res = await callAPI(text);
  const reply = res?.message || "I didn’t understand that.";

  messages.innerHTML += `<p><strong>LifePilot:</strong> ${reply}</p>`;
  messages.scrollTop = messages.scrollHeight;

  await syncData();
}

async function startVoiceInput(targetInputId, event) {
  const targetInput = document.getElementById(targetInputId);
  if (!targetInput) {
    console.error("[FRONTEND] Voice target input not found:", targetInputId);
    return;
  }

  const activeMicButton = event?.currentTarget;
  if (activeMicButton) activeMicButton.classList.add("recording");

  try {
    console.log("[FRONTEND] Starting voice input for:", targetInputId);

    const res = await fetch("/voice/listen", { method: "POST" });
    const data = await res.json();

    console.log("[FRONTEND] Voice response:", data);

    if (data.status === "success" && data.text?.trim()) {
      targetInput.value = data.text.trim();
      targetInput.focus();

      if (targetInputId === "user-input") {
        await sendMessage();
      } else if (targetInputId === "taskInput") {
        await addItem("task");
      } else if (targetInputId === "expenseTitleInput") {
        await addItem("spending");
      }
    } else {
      alert(data.message || "No speech detected.");
    }
  } catch (err) {
    console.error("[FRONTEND] Voice input error:", err);
    alert("Voice input failed.");
  } finally {
    if (activeMicButton) activeMicButton.classList.remove("recording");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.tasks = [];
  window.spending = [];

  syncData();

  const taskInput = document.getElementById("taskInput");
  const taskAddBtn = document.getElementById("taskAddBtn");

  const expenseTitleInput = document.getElementById("expenseTitleInput");
  const expenseAmountInput = document.getElementById("expenseAmountInput");
  const spendingAddBtn = document.getElementById("spendingAddBtn");

  const chatInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("sendBtn");

  if (taskInput) {
    taskInput.addEventListener("keydown", e => {
      if (e.key === "Enter") addItem("task");
    });
  }

  if (taskAddBtn) {
    taskAddBtn.addEventListener("click", () => addItem("task"));
  } else {
    console.warn("[FRONTEND] taskAddBtn not found");
  }

  if (expenseTitleInput) {
    expenseTitleInput.addEventListener("keydown", e => {
      if (e.key === "Enter") addItem("spending");
    });
  }

  if (expenseAmountInput) {
    expenseAmountInput.addEventListener("keydown", e => {
      if (e.key === "Enter") addItem("spending");
    });
  }

  if (spendingAddBtn) {
    spendingAddBtn.addEventListener("click", () => addItem("spending"));
  } else {
    console.warn("[FRONTEND] spendingAddBtn not found");
  }

  if (chatInput) {
    chatInput.addEventListener("keydown", e => {
      if (e.key === "Enter") sendMessage();
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  const firstBtn = document.querySelector(".nav-btn");
  if (firstBtn) firstBtn.classList.add("active");
});
