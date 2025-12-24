// API Configuration
const API_BASE_URL = "http://localhost:3000";
const API_URL = `${API_BASE_URL}/todos`;

// DOM Elements
const themeToggle = document.getElementById("themeToggle");
const taskForm = document.getElementById("taskForm");
const tasksList = document.getElementById("tasksList");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const editModal = document.getElementById("editModal");
const deleteModal = document.getElementById("deleteModal");
const editForm = document.getElementById("editForm");
const toast = document.getElementById("toast");
const serverStatus = document.getElementById("serverStatus");
const updateTaskBtn = document.getElementById("updateTaskBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// State Variables
let tasks = [
  {
    id: 1,
    title: "Complete Project Presentation",
    description: "Finish the to-do app project and prepare for presentation",
    category: "personal",
    dueDate: new Date().toISOString().split("T")[0],
    completed: true,
    createdAt: new Date().toISOString(),
  },
];
let currentEditId = null;
let currentDeleteId = null;
let searchTimeout = null;
let isServerOnline = false;

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  updateStats();
  setupEventListeners();
  initializeSortable();

  // Check server status
  checkServerStatus();

  // Start polling for server status
  setInterval(checkServerStatus, 5000);
});

// Check if JSON Server is running   and get
async function checkServerStatus() {
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
      Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      isServerOnline = true;
      serverStatus.innerHTML =
        '<i class="fas fa-server"></i><span>JSON Server Online</span>';
      serverStatus.className = "server-status online";

      // Load tasks from server
      loadTasksFromServer();
    } else {
      throw new Error("Server not responding");
    }
  } catch (error) {
    isServerOnline = false;
    serverStatus.innerHTML =
      '<i class="fas fa-server"></i><span>JSON Server Offline - Using Local Storage</span>';
    serverStatus.className = "server-status offline";
  }
}

// Load tasks from server
async function loadTasksFromServer() {
  if (!isServerOnline) return;

  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const serverTasks = await response.json();
      if (serverTasks.length > 0) {
        tasks = serverTasks;
        renderTasks();
        updateStats();
        saveToLocalStorage();
      }
    }
  } catch (error) {
    console.error("Error loading from server:", error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);

  // Task form submission
  taskForm.addEventListener("submit", handleAddTask);

  // Category selection
  document.querySelectorAll(".category-option").forEach((option) => {
    option.addEventListener("click", () => {
      document
        .querySelectorAll(".category-option")
        .forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");
      document.getElementById("category").value = option.dataset.category;
    });
  });

  // Search input
  searchInput.addEventListener("input", handleSearch);

  // Filter select
  filterSelect.addEventListener("change", () => {
    renderTasks();
  });

  // Modal close buttons
  document
    .getElementById("closeEditModal")
    .addEventListener("click", () => (editModal.style.display = "none"));
  document
    .getElementById("closeDeleteModal")
    .addEventListener("click", () => (deleteModal.style.display = "none"));
  document
    .getElementById("cancelEditBtn")
    .addEventListener("click", () => (editModal.style.display = "none"));
  document
    .getElementById("cancelDeleteBtn")
    .addEventListener("click", () => (deleteModal.style.display = "none"));

  // Edit form submission
  editForm.addEventListener("submit", handleEditTask);

  // Confirm delete
  confirmDeleteBtn.addEventListener("click", handleDeleteTask);

  // Close modals when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === editModal) editModal.style.display = "none";
    if (e.target === deleteModal) deleteModal.style.display = "none";
  });

  // Add event listeners to existing demo task buttons
  document.querySelectorAll(".task-complete input").forEach((checkbox) => {
    checkbox.addEventListener("change", handleToggleComplete);
  });

  document.querySelectorAll(".action-btn.edit").forEach((btn) => {
    btn.addEventListener("click", handleEditClick);
  });

  document.querySelectorAll(".action-btn.delete").forEach((btn) => {
    btn.addEventListener("click", handleDeleteClick);
  });
}

// Toggle dark/light theme
function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark-theme") ? "dark" : "light"
  );
}

// Load saved theme preference
function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }
}

// Initialize Sortable drag and drop
function initializeSortable() {
  new Sortable(tasksList, {
    animation: 150,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    onEnd: function () {
      showToast("Tasks reordered!", "success");
    },
  });
}

// Save tasks to localStorage
function saveToLocalStorage() {
  localStorage.setItem("nexustask-tasks", JSON.stringify(tasks));
}

// Load tasks from localStorage
function loadFromLocalStorage() {
  const savedTasks = localStorage.getItem("nexustask-tasks");
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
    renderTasks();
    updateStats();
  }
}

// Render tasks to the DOM and search item
function renderTasks() {
  if (tasks.length === 0) {
    tasksList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-tasks"></i></div>
                        <h3>No tasks yet</h3>
                        <p>Add your first task using the form on the left</p>
                    </div>
                `;
    return;
  }

  let filteredTasks = [...tasks];
  const searchTerm = searchInput.value.toLowerCase().trim();
  const filterValue = filterSelect.value;

  // Apply search filter
  if (searchTerm) {
    filteredTasks = filteredTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description &&
          task.description.toLowerCase().includes(searchTerm))
    );
  }

  // Apply category filter
  if (filterValue !== "all") {
    if (filterValue === "completed") {
      filteredTasks = filteredTasks.filter((task) => task.completed);
    } else if (filterValue === "pending") {
      filteredTasks = filteredTasks.filter((task) => !task.completed);
    } else {
      filteredTasks = filteredTasks.filter(
        (task) => task.category === filterValue
      );
    }
  }

  if (filteredTasks.length === 0) {
    tasksList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-search"></i></div>
                        <h3>No tasks found</h3>
                        <p>Try adjusting your search or filter</p>
                    </div>
                `;
    return;
  }

  // Sort tasks: incomplete first, then by due date
  filteredTasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    return 0;
  });

  tasksList.innerHTML = filteredTasks
    .map((task) => createTaskElement(task))
    .join("");

  // Add event listeners to task buttons
  document.querySelectorAll(".task-complete input").forEach((checkbox) => {
    checkbox.addEventListener("change", handleToggleComplete);
  });

  document.querySelectorAll(".action-btn.edit").forEach((btn) => {
    btn.addEventListener("click", handleEditClick);
  });

  document.querySelectorAll(".action-btn.delete").forEach((btn) => {
    btn.addEventListener("click", handleDeleteClick);
  });
}

// Create HTML for a task card
function createTaskElement(task) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dueDateText = "No due date";
  let isOverdue = false;

  if (dueDate) {
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      dueDateText = "Today";
    } else if (diffDays === 1) {
      dueDateText = "Tomorrow";
    } else if (diffDays === -1) {
      dueDateText = "Yesterday";
      isOverdue = true;
    } else if (diffDays < 0) {
      dueDateText = `${Math.abs(diffDays)} days ago`;
      isOverdue = true;
    } else {
      dueDateText = `In ${diffDays} days`;
    }

    // Format date for display
    const formattedDate = dueDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    dueDateText += ` (${formattedDate})`;
  }

  const overdueClass = isOverdue && !task.completed ? "overdue" : "";
  const completedClass = task.completed ? "completed" : "";

  return `
                <div class="task-card ${
                  task.category
                } ${completedClass}" data-id="${task.id}">
                    <div class="task-header">
                        <div>
                            <h3 class="task-title">${escapeHtml(
                              task.title
                            )}</h3>
                            <span class="task-category category-${
                              task.category
                            }">${
    task.category.charAt(0).toUpperCase() + task.category.slice(1)
  }</span>
                        </div>
                        <div class="task-complete">
                            <label class="checkbox-container">
                                <input type="checkbox" ${
                                  task.completed ? "checked" : ""
                                } data-id="${task.id}">
                                <span class="checkmark"></span>
                            </label>
                        </div>
                    </div>
                    <p class="task-description">${escapeHtml(
                      task.description || "No description"
                    )}</p>
                    <div class="task-footer">
                        <div class="task-due ${overdueClass}">
                            <i class="fas fa-calendar-day"></i>
                            <span>${dueDateText}</span>
                        </div>
                        <div class="task-actions">
                            <button class="action-btn edit" data-id="${
                              task.id
                            }">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" data-id="${
                              task.id
                            }">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
}

// Update statistics
function updateStats() {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;

  // Count overdue tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = tasks.filter((task) => {
    if (task.completed || !task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;

  document.getElementById("totalTasks").textContent = totalTasks;
  document.getElementById("completedTasks").textContent = completedTasks;
  document.getElementById("pendingTasks").textContent = pendingTasks;
  document.getElementById("overdueTasks").textContent = overdueTasks;
}

// Handle adding a new task
async function handleAddTask(e) {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value;
  const dueDate = document.getElementById("dueDate").value;

  if (!title) {
    showToast("Please enter a task title", "error");
    return;
  }

  const newTask = {
    id: Date.now(),
    title,
    description,
    category,
    dueDate: dueDate || null,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  const submitBtn = document.getElementById("submitBtn");
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<div class="loading"></div>';
  submitBtn.disabled = true;

  try {
    // Add to local array
    tasks.push(newTask);

    // Update UI
    renderTasks();
    updateStats();

    // Save to localStorage
    saveToLocalStorage();

    // Try to save to server
    if (isServerOnline) {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        showToast("Task added to server!", "success");
      }
    } else {
      showToast("Task added to local storage!", "success");
    }

    // Reset form
    taskForm.reset();
    document.getElementById("category").value = "personal";
    document.querySelectorAll(".category-option").forEach((opt) => {
      opt.classList.toggle("active", opt.dataset.category === "personal");
    });
  } catch (error) {
    console.error("Error adding task:", error);
    showToast("Task added to local storage!", "success");
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Handle toggling task completion
async function handleToggleComplete(e) {
  const taskId = parseInt(e.target.dataset.id);
  const isCompleted = e.target.checked;

  // Find the task
  const taskIndex = tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) return;

  // Update task in array
  tasks[taskIndex].completed = isCompleted;

  // Update UI immediately
  const taskCard = e.target.closest(".task-card");
  if (taskCard) {
    if (isCompleted) {
      taskCard.classList.add("completed");
    } else {
      taskCard.classList.remove("completed");
    }
  }

  // Update stats
  updateStats();

  // Save to localStorage
  saveToLocalStorage();

  // Try to update on server
  if (isServerOnline) {
    try {
      await fetch(`${API_URL}/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: isCompleted }),
      });
    } catch (error) {
      console.error("Error updating server:", error);
    }
  }

  showToast(
    `Task marked as ${isCompleted ? "completed" : "pending"}!`,
    "success"
  );
}

// Handle edit button click
function handleEditClick(e) {
  const taskId = parseInt(e.currentTarget.dataset.id);
  const task = tasks.find((t) => t.id === taskId);

  if (!task) return;

  currentEditId = taskId;
  document.getElementById("editId").value = taskId;
  document.getElementById("editTitle").value = task.title;
  document.getElementById("editDescription").value = task.description || "";
  document.getElementById("editCategory").value = task.category;
  document.getElementById("editDueDate").value = task.dueDate || "";

  editModal.style.display = "flex";
}

// Handle edit form submission
async function handleEditTask(e) {
  e.preventDefault();

  const title = document.getElementById("editTitle").value.trim();
  const description = document.getElementById("editDescription").value.trim();
  const category = document.getElementById("editCategory").value;
  const dueDate = document.getElementById("editDueDate").value;

  if (!title) {
    showToast("Please enter a task title", "error");
    return;
  }

  const updatedTask = {
    title,
    description,
    category,
    dueDate: dueDate || null,
  };

  const updateBtn = updateTaskBtn;
  const originalText = updateBtn.innerHTML;
  updateBtn.innerHTML = '<div class="loading"></div>';
  updateBtn.disabled = true;

  try {
    // Update in local array
    const taskIndex = tasks.findIndex((t) => t.id === currentEditId);
    if (taskIndex === -1) throw new Error("Task not found");

    tasks[taskIndex] = { ...tasks[taskIndex], ...updatedTask };

    // Update UI
    renderTasks();
    updateStats();

    // Save to localStorage
    saveToLocalStorage();

    // Try to update on server
    if (isServerOnline) {
      await fetch(`${API_URL}/${currentEditId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTask),
      });
    }

    // Close modal
    editModal.style.display = "none";
    showToast("Task updated successfully!", "success");
  } catch (error) {
    console.error("Error updating task:", error);
    showToast("Failed to update task", "error");
  } finally {
    updateBtn.innerHTML = originalText;
    updateBtn.disabled = false;
  }
}

// Handle delete button click
function handleDeleteClick(e) {
  const taskId = parseInt(e.currentTarget.dataset.id);
  currentDeleteId = taskId;
  deleteModal.style.display = "flex";
}

// Handle task deletion
async function handleDeleteTask() {
  const deleteBtn = confirmDeleteBtn;
  const originalText = deleteBtn.innerHTML;
  deleteBtn.innerHTML = '<div class="loading"></div>';
  deleteBtn.disabled = true;

  try {
    // Remove from local array
    const taskIndex = tasks.findIndex((t) => t.id === currentDeleteId);
    if (taskIndex === -1) throw new Error("Task not found");

    // Remove task
    tasks.splice(taskIndex, 1);

    // Update UI
    renderTasks();
    updateStats();

    // Save to localStorage
    saveToLocalStorage();

    // Try to delete from server
    if (isServerOnline) {
      await fetch(`${API_URL}/${currentDeleteId}`, {
        method: "DELETE",
      });
    }

    // Close modal
    deleteModal.style.display = "none";
    showToast("Task deleted successfully!", "success");
  } catch (error) {
    console.error("Error deleting task:", error);
    showToast("Failed to delete task", "error");
  } finally {
    deleteBtn.innerHTML = originalText;
    deleteBtn.disabled = false;
  }
}

// Handle search input with debouncing
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderTasks();
  }, 300);
}

// Show toast notification
function showToast(message, type = "success") {
  const toastMessage = document.getElementById("toastMessage");
  const toastIcon = document.getElementById("toastIcon");

  toastMessage.textContent = message;
  toast.className = "toast";

  if (type === "success") {
    toast.classList.add("success");
    toastIcon.className = "fas fa-check-circle";
  } else {
    toast.classList.add("error");
    toastIcon.className = "fas fa-exclamation-circle";
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
