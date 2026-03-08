
function showSection(sectionId) {
  document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(btn => {
    if (btn.getAttribute("onclick")?.includes(`'${sectionId}'`)) btn.classList.add("active");
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
    console.log("[FRONTEND] Received:", data);
    return data;
  } catch (err) {
    console.error("[FRONTEND] API error:", err);
    return null;
  }
}


function renderList(listArray, containerId, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  listArray.forEach(item => {
    const div = document.createElement("div");
    div.className = `${type}-card`;
    div.innerHTML = `
      <div class="${type}-info">
        <h3 class="${item.completed ? 'completed-task' : ''}">${item.title}</h3>
        ${item.amount !== undefined ? `<p>Amount: $${Number(item.amount).toFixed(2)}</p>` : ""}
        ${item.time ? `<p>Time: ${item.time}</p>` : ""}
        <p>Status: ${item.completed ? 'Completed' : 'Pending'}</p>
      </div>
      <div class="${type}-actions">
        ${item.completed ? '<span class="done-badge">Done</span>' : `<button onclick="completeItem('${type}', ${item.id})">Complete</button>`}
        <button class="delete-btn" onclick="deleteItem('${type}', ${item.id})">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });

  updateDashboardCards();
}


function updateDashboardCards() {
  const totalTasks = window.tasks?.length || 0;
  const completedTasks = window.tasks?.filter(t => t.completed).length || 0;
  const totalSpending = window.spending?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  if (document.getElementById("totalTasksCard")) document.getElementById("totalTasksCard").textContent = totalTasks;
  if (document.getElementById("completedTasksCard")) document.getElementById("completedTasksCard").textContent = completedTasks;
  if (document.getElementById("dashboardSpending")) document.getElementById("dashboardSpending").textContent = `$${totalSpending.toFixed(2)}`;
  if (document.getElementById("totalSpending")) document.getElementById("totalSpending").textContent = `$${totalSpending.toFixed(2)}`;
}


async function addItem(type) {
  let inputId, amountId;
  switch (type) {
    case "task": inputId = "taskInput"; break;
    case "spending": inputId = "expenseTitleInput"; amountId = "expenseAmountInput"; break;
    default: return;
  }

  const input = document.getElementById(inputId);
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();

  let apiText = text;
  let manualAmount = 0;

  if (type === "spending") {
    const amountInput = document.getElementById(amountId);
    if (amountInput && amountInput.value) {
      manualAmount = parseFloat(amountInput.value);
      apiText += ` $${manualAmount}`;
    }
  }

  const res = await callAPI(apiText);
  
  if (!res || res.status === "error" || !res.data) {
    console.error("[FRONTEND] Backend could not process request:", res?.message);
    return; 
  }

  input.value = "";
  
  if (type === "task") {
    if (!window.tasks) window.tasks = [];
    window.tasks.push({ 
      id: res.data.id || Date.now(), 
      title: res.data.title || text, 
      time: res.data.due_date || "", 
      completed: false 
    });
    renderList(window.tasks, "taskList", "task");
  } else if (type === "spending") {
    if (!window.spending) window.spending = [];
    
    const finalTitle = res.data.title || res.data.category || text;
    const finalAmount = res.data.amount || manualAmount || 0;

    window.spending.push({ 
      id: res.data.id || Date.now(), 
      title: finalTitle, 
      amount: finalAmount 
    });

    const amountInput = document.getElementById(amountId);
    if (amountInput) amountInput.value = "";
    renderList(window.spending, "spendingList", "spending");
  }
}

async function completeItem(type, id) {
  if (type === "task") {
    await fetch(`/api/tasks/complete/${id}`, { method: "POST" });
    await syncData(); 
  }
}

async function deleteItem(type, id) {
  const url = type === "task" ? `/api/tasks/${id}` : `/api/finance/${id}`;
  await fetch(url, { method: "DELETE" });
  await syncData();
}


   // CHAT

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
}


async function syncData() {
  try {
    const res = await fetch("/api/init");
    const data = await res.json();
    
    window.tasks = data.tasks.map(t => ({
      id: t.id,
      title: t.title,
      time: t.due_date || "",
      completed: t.completed
    }));
    
    window.spending = data.spending.map(s => ({
      id: s.id,
      title: s.category || s.description || "Expense",
      amount: s.amount
    }));

    renderList(window.tasks, "taskList", "task");
    renderList(window.spending, "spendingList", "spending");

  } catch (err) {
    console.error("Could not load database:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.tasks = [];
  window.spending = [];

  syncData();

  ["task", "spending"].forEach(type => {
    const inputId = type === "spending" ? "expenseTitleInput" : "taskInput";
    const el = document.getElementById(inputId);
    const btn = document.getElementById(type + "AddBtn");
    
    if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") addItem(type); });
    if (btn) btn.addEventListener("click", () => addItem(type));
  });

  const firstBtn = document.querySelector(".nav-btn");
  if (firstBtn) firstBtn.classList.add("active");
});
