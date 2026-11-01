// ===== SETTINGS =====
const STORAGE_KEY = "cloudTodoTasks";   // LocalStorage key

let tasks = loadFromStorage();   // All tasks
let currentFilter = "all";       // all | pending | completed
let editingId = null;            // ID of the task being edited (null = adding new)

// ===== PAGE ELEMENTS =====
const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const dueDateInput = document.getElementById("dueDate");
const priorityInput = document.getElementById("priority");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");
const searchInput = document.getElementById("searchInput");
const taskList = document.getElementById("taskList");
const toast = document.getElementById("toast");
const filterButtons = document.querySelectorAll(".filter-btn");

let toastTimer;

// ===== LOCALSTORAGE =====
function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ===== SHOW SUCCESS / ERROR MESSAGE =====
function showToast(message, type) {
  toast.textContent = message;
  toast.className = "toast " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.add("hidden");
  }, 3000);
}

// ===== SAFE TEXT (prevents HTML code from running) =====
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}

function nowString() {
  return new Date().toLocaleString();
}

// ===== SHOW STATS =====
function updateStats() {
  const completed = tasks.filter(function (t) { return t.completed === 1; }).length;
  document.getElementById("totalCount").textContent = tasks.length;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("pendingCount").textContent = tasks.length - completed;
}

// ===== SHOW TASKS (with search + filter) =====
function renderTasks() {
  updateStats();

  const searchText = searchInput.value.trim().toLowerCase();

  const visible = tasks.filter(function (task) {
    if (currentFilter === "pending" && task.completed === 1) return false;
    if (currentFilter === "completed" && task.completed === 0) return false;

    const text = (task.title + " " + task.description).toLowerCase();
    return text.includes(searchText);
  });

  if (visible.length === 0) {
    taskList.innerHTML = '<p class="empty">📭 No tasks found.</p>';
    return;
  }

  const today = todayString();
  let html = "";

  visible.forEach(function (task) {
    const isDone = task.completed === 1;
    const isOverdue = task.due_date && !isDone && task.due_date < today;

    html +=
      '<div class="task-card priority-' + task.priority + (isDone ? " completed" : "") + '">' +
        '<div class="task-top">' +
          '<h3>' + esc(task.title) + '</h3>' +
          '<span class="badge ' + task.priority + '">' + task.priority + '</span>' +
        '</div>' +
        (task.description ? '<p class="task-desc">' + esc(task.description) + '</p>' : '') +
        '<div class="task-meta">' +
          '<span class="' + (isOverdue ? "overdue" : "") + '">📅 Due: ' +
            (task.due_date ? esc(task.due_date) : "No date") + (isOverdue ? " (Overdue)" : "") + '</span>' +
          '<span>🕒 Created: ' + esc(task.created_at) + '</span>' +
          '<span>' + (isDone ? "✅ Completed" : "⏳ Pending") + '</span>' +
        '</div>' +
        '<div class="task-actions">' +
          '<button class="action-btn btn-complete" data-action="complete" data-id="' + task.id + '">' +
            (isDone ? "↩ Mark Pending" : "✔ Complete") + '</button>' +
          '<button class="action-btn btn-edit" data-action="edit" data-id="' + task.id + '">✏ Edit</button>' +
          '<button class="action-btn btn-delete" data-action="delete" data-id="' + task.id + '">🗑 Delete</button>' +
        '</div>' +
      '</div>';
  });

  taskList.innerHTML = html;
}

// ===== RESET FORM BACK TO "ADD" MODE =====
function resetForm() {
  taskForm.reset();
  priorityInput.value = "Medium";
  editingId = null;
  formTitle.textContent = "➕ Add New Task";
  submitBtn.textContent = "➕ Add Task";
  cancelBtn.classList.add("hidden");
}

// ===== ADD OR UPDATE TASK =====
taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (title === "") {
    showToast("❌ Task title is required.", "error");
    return;
  }

  if (editingId === null) {
    // Add a new task (newest first)
    tasks.unshift({
      id: Date.now(),
      title: title,
      description: descriptionInput.value.trim(),
      due_date: dueDateInput.value,
      priority: priorityInput.value,
      completed: 0,
      created_at: nowString()
    });
    showToast("✅ Task added successfully!", "success");
  } else {
    // Update the existing task
    const task = tasks.find(function (t) { return t.id === editingId; });
    if (task) {
      task.title = title;
      task.description = descriptionInput.value.trim();
      task.due_date = dueDateInput.value;
      task.priority = priorityInput.value;
    }
    showToast("✅ Task updated successfully!", "success");
  }

  saveToStorage();
  resetForm();
  renderTasks();
});

cancelBtn.addEventListener("click", resetForm);

// ===== BUTTONS INSIDE TASK CARDS (Complete / Edit / Delete) =====
taskList.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;
  const task = tasks.find(function (t) { return t.id === id; });
  if (!task) return;

  if (action === "complete") {
    task.completed = task.completed === 1 ? 0 : 1;
    saveToStorage();
    renderTasks();
    showToast("✅ Task status updated!", "success");
  }

  if (action === "edit") {
    editingId = id;
    titleInput.value = task.title;
    descriptionInput.value = task.description;
    dueDateInput.value = task.due_date;
    priorityInput.value = task.priority;
    formTitle.textContent = "✏ Edit Task";
    submitBtn.textContent = "💾 Update Task";
    cancelBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    titleInput.focus();
  }

  if (action === "delete") {
    if (!confirm("Are you sure you want to delete this task?")) return;
    tasks = tasks.filter(function (t) { return t.id !== id; });
    if (editingId === id) resetForm();
    saveToStorage();
    renderTasks();
    showToast("🗑 Task deleted.", "success");
  }
});

// ===== SEARCH =====
searchInput.addEventListener("input", renderTasks);

// ===== FILTER BUTTONS =====
filterButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    renderTasks();
  });
});

// ===== START =====
renderTasks();
