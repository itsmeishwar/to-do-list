// To-Do List Frontend App

class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
    }

    bindEvents() {
        // Form submission
        const form = document.getElementById('task-form');
        form.addEventListener('submit', (e) => this.handleAddTask(e));

        // Filter buttons
        document.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });

        // Refresh button
        document.getElementById('refresh').addEventListener('click', () => this.loadTasks());
    }

    async handleAddTask(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const taskData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            dueDate: formData.get('dueDate')
        };

        if (!taskData.title) return;

        try {
            const response = await fetch('http://localhost:3000/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                e.target.reset();
                this.loadTasks();
                this.showStatus('Task added successfully!', 'success');
            } else {
                const error = await response.json();
                this.showStatus(error.error || 'Failed to add task', 'error');
            }
        } catch (err) {
            this.showStatus('Network error', 'error');
        }
    }

    handleFilter(e) {
        const filter = e.target.dataset.filter;
        this.currentFilter = filter;

        // Update active tab
        document.querySelectorAll('.tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
            btn.setAttribute('aria-selected', btn.dataset.filter === filter);
        });

        this.renderTasks();
    }

    async loadTasks() {
        try {
            const response = await fetch(`http://localhost:3000/api/tasks?filter=${this.currentFilter}`);
            if (response.ok) {
                this.tasks = await response.json();
                this.renderTasks();
                this.updateStats();
            } else {
                this.showStatus('Failed to load tasks', 'error');
            }
        } catch (err) {
            this.showStatus('Network error', 'error');
        }
    }

    renderTasks() {
        const taskList = document.getElementById('task-list');
        const empty = document.getElementById('empty');

        if (this.tasks.length === 0) {
            taskList.innerHTML = '';
            empty.hidden = false;
            return;
        }

        empty.hidden = true;
        taskList.innerHTML = this.tasks.map(task => this.createTaskElement(task)).join('');
    }

    createTaskElement(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

        return `
            <li class="task-item" data-id="${task.id}">
                <div class="task-top">
                    <div class="checkbox">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="app.toggleTask('${task.id}')">
                        <span class="task-title ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.title)}</span>
                    </div>
                    <div class="task-meta">
                        ${dueDate ? `<span class="due-chip ${isOverdue ? 'overdue' : ''}">📅 ${dueDate}</span>` : ''}
                    </div>
                    <div class="task-actions">
                        <button class="btn small" onclick="app.editTask('${task.id}')">Edit</button>
                        <button class="btn small danger" onclick="app.deleteTask('${task.id}')">Delete</button>
                    </div>
                </div>
                ${task.description ? `<div class="task-desc">${this.escapeHtml(task.description)}</div>` : ''}
                <div class="edit-row" id="edit-${task.id}">
                    <input type="text" value="${this.escapeHtml(task.title)}" placeholder="Title">
                    <textarea placeholder="Description">${this.escapeHtml(task.description || '')}</textarea>
                    <input type="date" value="${task.dueDate || ''}">
                    <button class="btn small" onclick="app.saveEdit('${task.id}')">Save</button>
                    <button class="btn small" onclick="app.cancelEdit('${task.id}')">Cancel</button>
                </div>
            </li>
        `;
    }

    async toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        try {
            const response = await fetch(`http://localhost:3000/api/tasks/${id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !task.completed })
            });

            if (response.ok) {
                this.loadTasks();
            } else {
                this.showStatus('Failed to update task', 'error');
            }
        } catch (err) {
            this.showStatus('Network error', 'error');
        }
    }

    editTask(id) {
        const editRow = document.getElementById(`edit-${id}`);
        editRow.classList.add('active');
    }

    cancelEdit(id) {
        const editRow = document.getElementById(`edit-${id}`);
        editRow.classList.remove('active');
    }

    async saveEdit(id) {
        const editRow = document.getElementById(`edit-${id}`);
        const inputs = editRow.querySelectorAll('input, textarea');
        const [titleInput, descInput, dateInput] = inputs;

        const updateData = {
            title: titleInput.value.trim(),
            description: descInput.value.trim(),
            dueDate: dateInput.value,
            completed: this.tasks.find(t => t.id === id).completed
        };

        if (!updateData.title) {
            this.showStatus('Title is required', 'error');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                this.cancelEdit(id);
                this.loadTasks();
                this.showStatus('Task updated successfully!', 'success');
            } else {
                const error = await response.json();
                this.showStatus(error.error || 'Failed to update task', 'error');
            }
        } catch (err) {
            this.showStatus('Network error', 'error');
        }
    }

    async deleteTask(id) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });

            if (response.ok) {
                this.loadTasks();
                this.showStatus('Task deleted successfully!', 'success');
            } else {
                this.showStatus('Failed to delete task', 'error');
            }
        } catch (err) {
            this.showStatus('Network error', 'error');
        }
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const active = total - completed;

        document.getElementById('stats').textContent = `${total} tasks (${active} active, ${completed} completed)`;
    }

    showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        setTimeout(() => {
            status.textContent = '';
            status.className = 'status';
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();
});
