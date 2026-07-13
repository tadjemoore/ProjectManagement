class TaskView {
    constructor(viewContext) {
        this.view = viewContext;
    }

    renderTasksTable({ tasks, projects, users }, onToggle, onDelete, searchVal = '', scopeVal = 'all', statusVal = 'all', priorityVal = 'all', activeUserId) {
        const query = searchVal.toLowerCase().trim();

        const filtered = tasks.filter(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projTitle = project ? project.title : '';

            const matchesSearch = task.title.toLowerCase().includes(query) ||
                task.description.toLowerCase().includes(query) ||
                projTitle.toLowerCase().includes(query);

            const matchesScope = scopeVal === 'all' || task.assigneeId === activeUserId;
            const matchesStatus = statusVal === 'all' || task.status === statusVal;
            const matchesPriority = priorityVal === 'all' || task.priority === priorityVal;

            return matchesSearch && matchesScope && matchesStatus && matchesPriority;
        });

        if (filtered.length === 0) {
            this.view.globalTasksTableBody.innerHTML = '';
            this.view.tasksEmptyState.classList.remove('hidden');
            return;
        }

        this.view.tasksEmptyState.classList.add('hidden');
        this.view.globalTasksTableBody.innerHTML = filtered.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projTitle = project ? project.title : 'External Task';
            const assignee = users.find(u => u.id === task.assigneeId);
            const assigneeName = assignee ? assignee.name : 'Unassigned';

            return `
                <tr>
                    <td>
                        <label class="checkbox-container">
                            <input type="checkbox" class="task-check" data-id="${task.id}" ${task.status === 'completed' ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                    </td>
                    <td>
                        <strong>${task.title}</strong>
                        <div class="task-row-meta">${task.description || 'No description'}</div>
                    </td>
                    <td>${projTitle}</td>
                    <td>${assigneeName}</td>
                    <td>
                        <span class="badge badge-${task.priority}">${task.priority}</span>
                    </td>
                    <td class="task-date-cell">${task.dueDate || 'No date'}</td>
                    <td>
                        <button class="btn-delete-task" data-id="${task.id}" title="Delete Task">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.view.globalTasksTableBody.querySelectorAll('.task-check').forEach(input => {
            input.addEventListener('change', () => {
                const id = input.getAttribute('data-id');
                onToggle(id);
            });
        });

        this.view.globalTasksTableBody.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this task?')) {
                    onDelete(id);
                }
            });
        });
    }
}
