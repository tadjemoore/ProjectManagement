class DashboardView {
    constructor(viewContext) {
        this.view = viewContext;
    }

    renderDashboardStats(stats) {
        this.view.statTotalProjects.textContent = stats.totalProjects;
        this.view.statInProgressProjects.textContent = stats.inProgressProjects;
        this.view.statCompletedTasks.textContent = stats.completedTasks;
        this.view.statPendingTasks.textContent = stats.pendingTasks;
    }

    renderDashboardMyProjects(projects, onProjectClick) {
        this.view.myProjectsCount.textContent = projects.length;

        if (projects.length === 0) {
            this.view.myProjectsContainer.innerHTML = `
                <div class="empty-state-card" style="padding: 24px; border: none; background: transparent;">
                    <p style="font-size: 13px;">You are not assigned to any active projects.</p>
                </div>
            `;
            return;
        }

        this.view.myProjectsContainer.innerHTML = projects.map(proj => {
            const totalTasks = proj.tasksCount || 0;
            const completedTasks = proj.completedTasksCount || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const statusLabel = proj.status.replace('_', ' ');

            return `
                <div class="project-compact-card" data-id="${proj.id}">
                    <div class="project-compact-header">
                        <h4>${proj.title}</h4>
                        <span class="badge badge-${proj.status.replace('_', '-')}">${statusLabel}</span>
                    </div>
                    <div class="progress-label-row">
                        <span style="color: var(--text-muted); font-size: 11px;">Checklist: ${completedTasks}/${totalTasks}</span>
                        <span style="color: var(--color-secondary); font-size: 11px;">${progress}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                    </div>
                </div>
            `;
        }).join('');

        this.view.myProjectsContainer.querySelectorAll('.project-compact-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                onProjectClick(id);
            });
        });
    }

    renderDashboardMyTasks(tasks, projects, onToggle, onDelete) {
        this.view.myTasksCount.textContent = tasks.length;

        if (tasks.length === 0) {
            this.view.myTasksContainer.innerHTML = `
                <div class="empty-state-card" style="padding: 24px; border: none; background: transparent;">
                    <p style="font-size: 13px;">🎉 All your tasks are completed!</p>
                </div>
            `;
            return;
        }

        this.view.myTasksContainer.innerHTML = tasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projTitle = project ? project.title : 'External Task';

            return `
                <div class="task-compact-card">
                    <div class="task-compact-left">
                        <label class="checkbox-container">
                            <input type="checkbox" class="task-check" data-id="${task.id}">
                            <span class="checkmark"></span>
                        </label>
                        <div class="task-compact-info">
                            <h4>${task.title}</h4>
                            <p><i class="fa-solid fa-folder-closed"></i> ${projTitle}</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="badge badge-${task.priority}">${task.priority}</span>
                        <button class="btn-delete-task" data-id="${task.id}" title="Delete Task">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.view.myTasksContainer.querySelectorAll('.task-check').forEach(input => {
            input.addEventListener('change', () => {
                const id = input.getAttribute('data-id');
                onToggle(id);
            });
        });

        this.view.myTasksContainer.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this task?')) {
                    onDelete(id);
                }
            });
        });
    }
}
