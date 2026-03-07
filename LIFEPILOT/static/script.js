function showSection(sectionId) {
  const sections = document.querySelectorAll(".section");
  sections.forEach(section => section.classList.remove("active"));

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  const buttons = document.querySelectorAll(".nav-btn");
  buttons.forEach(btn => btn.classList.remove("active"));

  buttons.forEach(btn => {
    if (btn.getAttribute("onclick")?.includes(`'${sectionId}'`)) {
      btn.classList.add("active");
    }
  });
}

/* =========================
   TASKS
========================= */

let demoTasks = [];

function renderTasks(tasks) {
  const taskList = document.getElementById("taskList");
  if (!taskList) return;

  taskList.innerHTML = "";

  tasks.forEach(task => {
    const taskCard = document.createElement("div");
    taskCard.className = "task-card";

    taskCard.innerHTML = `
      <div class="task-info">
        <h3 class="${task.completed ? "completed-task" : ""}">${task.title}</h3>
        <p>Status: ${task.completed ? "Completed" : "Pending"}</p>
      </div>
      <div class="task-actions">
        ${
          task.completed
            ? `<span class="done-badge">Done</span>`
            : `<button onclick="completeTask(${task.id})">Complete</button>`
        }
        <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
      </div>
    `;

    taskList.appendChild(taskCard);
  });

  updateDashboardCards();
}

function addTask() {
  const taskInput = document.getElementById("taskInput");
  if (!taskInput) return;

  const text = taskInput.value.trim();
  if (text === "") return;

  const newTask = {
    id: Date.now(),
    title: text,
    completed: false
  };

  demoTasks.push(newTask);
  renderTasks(demoTasks);
  taskInput.value = "";
  taskInput.focus();
}

function completeTask(taskId) {
  demoTasks = demoTasks.map(task => {
    if (task.id === taskId) {
      return { ...task, completed: true };
    }
    return task;
  });

  renderTasks(demoTasks);
}

function deleteTask(taskId) {
  demoTasks = demoTasks.filter(task => task.id !== taskId);
  renderTasks(demoTasks);
}

function updateDashboardCards() {
  const totalTasks = demoTasks.length;
  const completedTasks = demoTasks.filter(task => task.completed).length;
  const pendingReminders = reminders.filter(reminder => !reminder.completed).length;
  const totalSpending = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  const totalTasksCard = document.getElementById("totalTasksCard");
  const completedTasksCard = document.getElementById("completedTasksCard");
  const remindersCard = document.getElementById("remindersCard");
  const dashboardSpending = document.getElementById("dashboardSpending");

  if (totalTasksCard) totalTasksCard.textContent = totalTasks;
  if (completedTasksCard) completedTasksCard.textContent = completedTasks;
  if (remindersCard) remindersCard.textContent = pendingReminders;
  if (dashboardSpending) dashboardSpending.textContent = `$${totalSpending.toFixed(2)}`;
}

/* =========================
   REMINDERS
========================= */

let reminders = [];

function renderReminders(reminderArray) {
  const reminderList = document.getElementById("reminderList");
  if (!reminderList) return;

  reminderList.innerHTML = "";

  reminderArray.forEach(reminder => {
    const reminderCard = document.createElement("div");
    reminderCard.className = "reminder-card";

    reminderCard.innerHTML = `
      <div class="reminder-info">
        <h3 class="${reminder.completed ? "completed-task" : ""}">${reminder.title}</h3>
        <p>Status: ${reminder.completed ? "Completed" : "Pending"}</p>
      </div>
      <div class="reminder-actions">
        ${
          reminder.completed
            ? `<span class="done-badge">Done</span>`
            : `<button onclick="completeReminder(${reminder.id})">Complete</button>`
        }
        <button class="delete-btn" onclick="deleteReminder(${reminder.id})">Delete</button>
      </div>
    `;

    reminderList.appendChild(reminderCard);
  });

  updateDashboardCards();
}

function addReminder() {
  const reminderInput = document.getElementById("reminderInput");
  if (!reminderInput) return;

  const text = reminderInput.value.trim();
  if (text === "") return;

  const newReminder = {
    id: Date.now(),
    title: text,
    completed: false
  };

  reminders.push(newReminder);
  renderReminders(reminders);
  reminderInput.value = "";
  reminderInput.focus();
}

function completeReminder(reminderId) {
  reminders = reminders.map(reminder => {
    if (reminder.id === reminderId) {
      return { ...reminder, completed: true };
    }
    return reminder;
  });

  renderReminders(reminders);
}

function deleteReminder(reminderId) {
  reminders = reminders.filter(reminder => reminder.id !== reminderId);
  renderReminders(reminders);
}

/* =========================
   SCHEDULE
========================= */

let scheduleItems = [];

function renderScheduleItems(items) {
  const scheduleList = document.getElementById("scheduleList");
  if (!scheduleList) return;

  scheduleList.innerHTML = "";

  items.forEach(item => {
    const scheduleCard = document.createElement("div");
    scheduleCard.className = "schedule-card";

    scheduleCard.innerHTML = `
      <div class="schedule-info">
        <h3 class="${item.completed ? "completed-task" : ""}">${item.title}</h3>
        <p>Time: ${item.time || "No time set"}</p>
        <p>Status: ${item.completed ? "Completed" : "Pending"}</p>
      </div>
      <div class="schedule-actions">
        ${
          item.completed
            ? `<span class="done-badge">Done</span>`
            : `<button onclick="completeScheduleItem(${item.id})">Complete</button>`
        }
        <button class="delete-btn" onclick="deleteScheduleItem(${item.id})">Delete</button>
      </div>
    `;

    scheduleList.appendChild(scheduleCard);
  });
}

function addScheduleItem() {
  const titleInput = document.getElementById("scheduleTitleInput");
  const timeInput = document.getElementById("scheduleTimeInput");

  if (!titleInput || !timeInput) return;

  const title = titleInput.value.trim();
  const time = timeInput.value;

  if (title === "") return;

  const newItem = {
    id: Date.now(),
    title: title,
    time: time,
    completed: false
  };

  scheduleItems.push(newItem);
  renderScheduleItems(scheduleItems);

  titleInput.value = "";
  timeInput.value = "";
  titleInput.focus();
}

function completeScheduleItem(scheduleId) {
  scheduleItems = scheduleItems.map(item => {
    if (item.id === scheduleId) {
      return { ...item, completed: true };
    }
    return item;
  });

  renderScheduleItems(scheduleItems);
}

function deleteScheduleItem(scheduleId) {
  scheduleItems = scheduleItems.filter(item => item.id !== scheduleId);
  renderScheduleItems(scheduleItems);
}

/* =========================
   SPENDING
========================= */

let expenses = [];

function renderExpenses(expenseArray) {
  const spendingList = document.getElementById("spendingList");
  if (!spendingList) return;

  spendingList.innerHTML = "";

  expenseArray.forEach(expense => {
    const expenseCard = document.createElement("div");
    expenseCard.className = "spending-card";

    expenseCard.innerHTML = `
      <div class="spending-info">
        <h3>${expense.title}</h3>
        <p>Amount: $${Number(expense.amount).toFixed(2)}</p>
      </div>
      <div class="spending-actions">
        <button class="delete-btn" onclick="deleteExpense(${expense.id})">Delete</button>
      </div>
    `;

    spendingList.appendChild(expenseCard);
  });

  updateTotalSpending();
  updateDashboardCards();
}

function addExpense() {
  const titleInput = document.getElementById("expenseTitleInput");
  const amountInput = document.getElementById("expenseAmountInput");

  if (!titleInput || !amountInput) return;

  const title = titleInput.value.trim();
  const amount = parseFloat(amountInput.value);

  if (title === "" || isNaN(amount) || amount < 0) return;

  const newExpense = {
    id: Date.now(),
    title: title,
    amount: amount
  };

  expenses.push(newExpense);
  renderExpenses(expenses);

  titleInput.value = "";
  amountInput.value = "";
  titleInput.focus();
}

function deleteExpense(expenseId) {
  expenses = expenses.filter(expense => expense.id !== expenseId);
  renderExpenses(expenses);
}

function updateTotalSpending() {
  const totalSpendingElement = document.getElementById("totalSpending");
  if (!totalSpendingElement) return;

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  totalSpendingElement.textContent = `$${total.toFixed(2)}`;
}

/* =========================
   CHAT
========================= */

function sendMessage() {
  const input = document.getElementById("user-input");
  const messages = document.getElementById("messages");
  if (!input || !messages) return;

  const text = input.value.trim();
  if (!text) return;

  messages.innerHTML += `<p><strong>You:</strong> ${text}</p>`;

  setTimeout(() => {
    messages.innerHTML += `<p><strong>LifePilot:</strong> Got it! (Backend not connected yet)</p>`;
    messages.scrollTop = messages.scrollHeight;
  }, 400);

  input.value = "";
  messages.scrollTop = messages.scrollHeight;
}

/* =========================
   API PLACEHOLDERS
========================= */

async function apiGetTasks() {
  console.log("GET /tasks (not connected yet)");
}

async function apiCreateTask(text) {
  console.log("POST /tasks:", text);
}

async function apiCompleteTask(id) {
  console.log("POST /tasks/complete:", id);
}

/* =========================
   PAGE LOAD
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const chatInput = document.getElementById("user-input");
  if (chatInput) {
    chatInput.addEventListener("keydown", e => {
      if (e.key === "Enter") sendMessage();
    });
  }

  const taskInput = document.getElementById("taskInput");
  if (taskInput) {
    taskInput.addEventListener("keydown", e => {
      if (e.key === "Enter") addTask();
    });
  }

  const reminderInput = document.getElementById("reminderInput");
  if (reminderInput) {
    reminderInput.addEventListener("keydown", e => {
      if (e.key === "Enter") addReminder();
    });
  }

  const scheduleTitleInput = document.getElementById("scheduleTitleInput");
  if (scheduleTitleInput) {
    scheduleTitleInput.addEventListener("keydown", e => {
      if (e.key === "Enter") addScheduleItem();
    });
  }

  const expenseAmountInput = document.getElementById("expenseAmountInput");
  if (expenseAmountInput) {
    expenseAmountInput.addEventListener("keydown", e => {
      if (e.key === "Enter") addExpense();
    });
  }

  const expenseTitleInput = document.getElementById("expenseTitleInput");
  if (expenseTitleInput) {
    expenseTitleInput.addEventListener("keydown", e => {
      if (e.key === "Enter") addExpense();
    });
  }

  const firstBtn = document.querySelector(".nav-btn");
  if (firstBtn) {
    firstBtn.classList.add("active");
  }

  renderTasks(demoTasks);
  renderReminders(reminders);
  renderScheduleItems(scheduleItems);
  renderExpenses(expenses);
  updateDashboardCards();
});