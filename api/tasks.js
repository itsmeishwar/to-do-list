const { Router } = require("express");
const { v4: uuidv4 } = require("uuid");
const { existsSync, mkdirSync, writeFileSync, readFileSync } = require("fs");
const { join, dirname } = require("path");

const router = Router();

// Allow tests to override data file via env
const DATA_FILE = process.env.TASKS_FILE || join(__dirname, "..", "data", "tasks.json");

function ensureDataFile() {
  const dir = dirname(DATA_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readTasks() {
  try {
    ensureDataFile();
    const raw = readFileSync(DATA_FILE, "utf8");
    const tasks = JSON.parse(raw || "[]");
    return Array.isArray(tasks) ? tasks : [];
  } catch (e) {
    return [];
  }
}

function writeTasks(tasks) {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), "utf8");
}

function sanitize(str) {
  return typeof str === "string" ? str.trim() : "";
}

// GET /api/tasks?filter=all|active|completed
router.get("/", (req, res) => {
  try {
    let tasks = readTasks();
    const filter = (req.query.filter || "all").toLowerCase();
    if (filter === "active") tasks = tasks.filter(t => !t.completed);
    else if (filter === "completed") tasks = tasks.filter(t => t.completed);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to read tasks" });
  }
});

// POST /api/tasks
router.post("/", (req, res) => {
  try {
    const title = sanitize(req.body.title);
    const description = sanitize(req.body.description);
    const dueDate = sanitize(req.body.dueDate);
    if (!title) return res.status(400).json({ error: "Title is required" });

    const now = new Date().toISOString();
    const task = {
      id: uuidv4(),
      title,
      description,
      dueDate,
      completed: false,
      createdAt: now,
      updatedAt: now
    };
    const tasks = readTasks();
    tasks.push(task);
    writeTasks(tasks);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// PUT /api/tasks/:id (full update)
router.put("/:id", (req, res) => {
  try {
    const id = req.params.id;
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: "Task not found" });

    const title = sanitize(req.body.title);
    const description = sanitize(req.body.description);
    const dueDate = sanitize(req.body.dueDate);
    const completed = !!req.body.completed;

    if (!title) return res.status(400).json({ error: "Title is required" });

    tasks[idx] = {
      ...tasks[idx],
      title,
      description,
      dueDate,
      completed,
      updatedAt: new Date().toISOString()
    };
    writeTasks(tasks);
    res.json(tasks[idx]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// PATCH /api/tasks/:id/complete (toggle or set)
router.patch("/:id/complete", (req, res) => {
  try {
    const id = req.params.id;
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: "Task not found" });

    const completed = req.body.completed;
    if (typeof completed !== "boolean") {
      return res.status(400).json({ error: "completed must be boolean" });
    }

    tasks[idx].completed = completed;
    tasks[idx].updatedAt = new Date().toISOString();
    writeTasks(tasks);
    res.json(tasks[idx]);
  } catch (err) {
    res.status(500).json({ error: "Failed to set completion" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", (req, res) => {
  try {
    const id = req.params.id;
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: "Task not found" });
    const [removed] = tasks.splice(idx, 1);
    writeTasks(tasks);
    res.json(removed);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = router;
